const express = require("express");
const db = require("./config/db");

const app = express();
const PORT = 5001;
const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Cancelled"];

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\\\/g, "\\\\\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function createBillPdf(bill) {
  const lines = [
    "CITY HOSPITAL",
    "Medical Bill",
    "",
    `Bill No: ${bill.bill_id}`,
    `Patient: ${bill.patient_name}`,
    `Doctor: ${bill.doctor_name}`,
    `Appointment Date: ${bill.appointment_date}`,
    `Appointment Time: ${bill.appointment_time}`,
    "",
    `Amount: INR ${Number(bill.amount).toFixed(2)}`,
    `Payment Status: ${bill.payment_status}`,
    "",
    "Thank you for choosing City Hospital.",
  ];
  const textCommands = lines
    .map((line, index) => `BT /F${index < 2 ? 2 : 1} ${index === 0 ? 22 : index === 1 ? 15 : 12} Tf 54 ${760 - index * 32} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(textCommands, "utf8")} >>\nstream\n${textCommands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function databaseError(res, error) {
  console.error(error);
  res.status(500).json({ message: "Database error" });
}

app.use(express.json());
app.use(express.static("frontend"));

// app.get("/", (req, res) => {
//   res.send("City Hospital Server is Running");
// });

app.get("/api/departments", (req, res) => {
  const sql = "SELECT * FROM departments";

  db.query(sql, (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.get("/api/doctors", (req, res) => {
  const sql = `
    SELECT 
      doctors.doctor_id,
      doctors.doctor_name,
      doctors.specialization,
      doctors.phone,
      departments.department_name
    FROM doctors
    JOIN departments ON doctors.department_id = departments.department_id
  `;

  db.query(sql, (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.get("/api/doctors/:id", (req, res) => {
  const doctorId = req.params.id;
  if (!isPositiveInteger(doctorId)) {
    return res.status(400).json({ message: "Invalid doctor ID." });
  }

  const sql = `
    SELECT
      doctors.doctor_id,
      doctors.doctor_name,
      doctors.specialization,
      doctors.phone,
      departments.department_name,
      departments.location
    FROM doctors
    JOIN departments ON doctors.department_id = departments.department_id
    WHERE doctors.doctor_id = ?
  `;

  db.query(sql, [doctorId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(404).json({ message: "Doctor not found." });
    } else {
      res.json(results[0]);
    }
  });
});

app.put("/api/doctors/:id/profile", (req, res) => {
  const doctorId = req.params.id;
  const { doctor_name, specialization, phone } = req.body;

  if (
    !isPositiveInteger(doctorId) ||
    ![doctor_name, specialization, phone].every(isNonEmptyString)
  ) {
    return res.status(400).json({ message: "Please provide valid profile details." });
  }

  const sql = `
    UPDATE doctors
    SET doctor_name = ?, specialization = ?, phone = ?
    WHERE doctor_id = ?
  `;

  db.query(sql, [doctor_name.trim(), specialization.trim(), phone.trim(), doctorId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.affectedRows === 0) {
      res.status(404).json({ message: "Doctor not found." });
    } else {
      res.json({ message: "Profile updated successfully." });
    }
  });
});

app.get("/api/patients", (req, res) => {
  const sql = `
    SELECT patient_id, patient_name, age, gender, phone, address,
      blood_group, allergies, medical_history, emergency_contact, emergency_phone
    FROM patients
  `;

  db.query(sql, (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.get("/api/appointments", (req, res) => {
  const sql = `
    SELECT 
      appointments.appointment_id,
      patients.patient_name,
      doctors.doctor_name,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time,
      appointments.status,
      bills.bill_id,
      bills.amount AS bill_amount,
      bills.payment_status
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.patient_id
    JOIN doctors ON appointments.doctor_id = doctors.doctor_id
    LEFT JOIN bills ON bills.appointment_id = appointments.appointment_id
  `;

  db.query(sql, (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.post("/api/patients", (req, res) => {
  const {
    patient_name, age, gender, phone, address, username, password,
    blood_group, allergies, medical_history, emergency_contact, emergency_phone,
  } = req.body;

  if (
    ![patient_name, gender, phone, address, username, password].every(isNonEmptyString) ||
    !isPositiveInteger(age) ||
    password?.length < 6
  ) {
    return res.status(400).json({
      message: "Please provide all patient details, a valid age, and a password of at least 6 characters.",
    });
  }

  const sql = `
    INSERT INTO patients (
      patient_name, age, gender, phone, address, username, password,
      blood_group, allergies, medical_history, emergency_contact, emergency_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      patient_name, age, gender, phone, address, username, password,
      blood_group || null, allergies || null, medical_history || null,
      emergency_contact || null, emergency_phone || null,
    ],
    (error, results) => {
      if (error) {
        databaseError(res, error);
      } else {
        res.json({
          message: "Patient added successfully",
          patient_id: results.insertId,
        });
      }
    },
  );
});

app.post("/api/doctors", (req, res) => {
  const { doctor_name, specialization, phone, department_id, username, password } = req.body;

  if (
    ![doctor_name, specialization, phone, username, password].every(isNonEmptyString) ||
    !isPositiveInteger(department_id) ||
    password?.length < 6
  ) {
    return res.status(400).json({
      message: "Please provide all doctor details, select a department, and use a password of at least 6 characters.",
    });
  }

  const sql = `
    INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [doctor_name, specialization, phone, department_id, username, password],
    (error, results) => {
      if (error) {
        databaseError(res, error);
      } else {
        res.json({
          message: "Doctor added successfully",
          doctor_id: results.insertId,
        });
      }
    },
  );
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";

  db.query(sql, [username, password], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid admin username or password" });
    } else {
      res.json({ message: "Admin login successful", admin: results[0] });
    }
  });
});

app.post("/api/doctor/login", (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const sql = "SELECT doctor_id, doctor_name, specialization, phone FROM doctors WHERE username = ? AND password = ?";

  db.query(sql, [username, password], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid doctor username or password" });
    } else {
      res.json({ message: "Doctor login successful", doctor: results[0] });
    }
  });
});

app.post("/api/patient/login", (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const sql = `
    SELECT patient_id, patient_name, age, gender, phone, address,
      blood_group, allergies, medical_history, emergency_contact, emergency_phone
    FROM patients WHERE username = ? AND password = ?
  `;

  db.query(sql, [username, password], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid patient username or password" });
    } else {
      res.json({ message: "Patient login successful", patient: results[0] });
    }
  });
});

app.get("/api/doctor/:id/appointments", (req, res) => {
  const doctorId = req.params.id;
  const sql = `
    SELECT 
      appointments.appointment_id,
      patients.patient_name,
      patients.age,
      patients.gender,
      patients.phone,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time,
      appointments.status,
      prescriptions.prescription_id,
      prescriptions.diagnosis,
      prescriptions.medicines,
      prescriptions.instructions
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.patient_id
    LEFT JOIN prescriptions ON prescriptions.appointment_id = appointments.appointment_id
    WHERE appointments.doctor_id = ?
  `;

  db.query(sql, [doctorId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.get("/api/doctor/:id/summary", (req, res) => {
  const doctorId = req.params.id;
  if (!isPositiveInteger(doctorId)) {
    return res.status(400).json({ message: "Invalid doctor ID." });
  }

  const sql = `
    SELECT
      COUNT(*) AS total_appointments,
      SUM(status = 'Pending') AS pending_appointments,
      SUM(status = 'Confirmed') AS confirmed_appointments,
      SUM(status = 'Cancelled') AS cancelled_appointments
    FROM appointments
    WHERE doctor_id = ?
  `;

  db.query(sql, [doctorId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results[0]);
    }
  });
});

app.get("/api/patient/:id/appointments", (req, res) => {
  const patientId = req.params.id;
  const sql = `
    SELECT 
      appointments.appointment_id,
      doctors.doctor_name,
      doctors.specialization,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time,
      appointments.status,
      prescriptions.diagnosis,
      prescriptions.medicines,
      prescriptions.instructions,
      bills.bill_id,
      bills.amount AS bill_amount,
      bills.payment_status
    FROM appointments
    JOIN doctors ON appointments.doctor_id = doctors.doctor_id
    LEFT JOIN prescriptions ON prescriptions.appointment_id = appointments.appointment_id
    LEFT JOIN bills ON bills.appointment_id = appointments.appointment_id
    WHERE appointments.patient_id = ?
  `;

  db.query(sql, [patientId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.put("/api/patient/:id/health-profile", (req, res) => {
  const patientId = req.params.id;
  const { blood_group, allergies, medical_history, emergency_contact, emergency_phone } = req.body;

  if (!isPositiveInteger(patientId)) {
    return res.status(400).json({ message: "Invalid patient ID." });
  }

  const sql = `
    UPDATE patients
    SET blood_group = ?, allergies = ?, medical_history = ?,
      emergency_contact = ?, emergency_phone = ?
    WHERE patient_id = ?
  `;

  db.query(
    sql,
    [
      blood_group || null, allergies || null, medical_history || null,
      emergency_contact || null, emergency_phone || null, patientId,
    ],
    (error, results) => {
      if (error) {
        databaseError(res, error);
      } else if (results.affectedRows === 0) {
        res.status(404).json({ message: "Patient not found." });
      } else {
        res.json({ message: "Health details updated successfully." });
      }
    },
  );
});

app.put("/api/appointments/:id/status", (req, res) => {
  const appointmentId = req.params.id;
  const { status } = req.body;
  if (!isPositiveInteger(appointmentId) || !APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid appointment or status." });
  }
  const sql = "UPDATE appointments SET status = ? WHERE appointment_id = ?";

  db.query(sql, [status, appointmentId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.affectedRows === 0) {
      res.status(404).json({ message: "Appointment not found." });
    } else {
      res.json({ message: "Appointment status updated successfully" });
    }
  });
});
app.post("/api/appointments", (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, status } =
    req.body;
  if (
    !isPositiveInteger(patient_id) ||
    !isPositiveInteger(doctor_id) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date) ||
    !/^\d{2}:\d{2}$/.test(appointment_time) ||
    !APPOINTMENT_STATUSES.includes(status)
  ) {
    return res.status(400).json({ message: "Please provide valid appointment details." });
  }
  const slotCheckSql = `
    SELECT appointment_id FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
      AND status <> 'Cancelled'
  `;
  db.query(slotCheckSql, [doctor_id, appointment_date, appointment_time], (slotError, slots) => {
    if (slotError) return databaseError(res, slotError);
    if (slots.length > 0) {
      return res.status(409).json({ message: "This doctor already has an appointment at the selected time." });
    }

    const sql = `
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sql, [patient_id, doctor_id, appointment_date, appointment_time, status], (error, results) => {
      if (error) {
        databaseError(res, error);
      } else {
        res.json({
          message: "Appointment added successfully",
          appointment_id: results.insertId,
        });
      }
    });
  });
});

app.post("/api/appointments/:id/prescription", (req, res) => {
  const appointmentId = req.params.id;
  const { diagnosis, medicines, instructions } = req.body;
  if (!isPositiveInteger(appointmentId) || ![diagnosis, medicines].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Diagnosis and medicines are required." });
  }

  const sql = `
    INSERT INTO prescriptions (appointment_id, diagnosis, medicines, instructions)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [appointmentId, diagnosis.trim(), medicines.trim(), instructions?.trim() || null], (error, results) => {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A prescription already exists for this appointment." });
    }
    if (error) return databaseError(res, error);
    res.status(201).json({ message: "Prescription saved successfully.", prescription_id: results.insertId });
  });
});

app.put("/api/appointments/:id/prescription", (req, res) => {
  const appointmentId = req.params.id;
  const { diagnosis, medicines, instructions } = req.body;

  if (!isPositiveInteger(appointmentId) || ![diagnosis, medicines].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Diagnosis and medicines are required." });
  }

  const sql = `
    UPDATE prescriptions
    SET diagnosis = ?, medicines = ?, instructions = ?
    WHERE appointment_id = ?
  `;
  db.query(
    sql,
    [diagnosis.trim(), medicines.trim(), instructions?.trim() || null, appointmentId],
    (error, results) => {
      if (error) return databaseError(res, error);
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Prescription not found." });
      }
      res.json({ message: "Prescription updated successfully." });
    },
  );
});

app.post("/api/appointments/:id/bill", (req, res) => {
  const appointmentId = req.params.id;
  const { amount, payment_status } = req.body;
  const validPaymentStatuses = ["Unpaid", "Paid"];
  if (!isPositiveInteger(appointmentId) || !Number.isFinite(Number(amount)) || Number(amount) < 0 || !validPaymentStatuses.includes(payment_status)) {
    return res.status(400).json({ message: "Please provide a valid bill amount and payment status." });
  }

  const sql = "INSERT INTO bills (appointment_id, amount, payment_status) VALUES (?, ?, ?)";
  db.query(sql, [appointmentId, amount, payment_status], (error, results) => {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A bill already exists for this appointment." });
    }
    if (error) return databaseError(res, error);
    res.status(201).json({ message: "Bill generated successfully.", bill_id: results.insertId });
  });
});

app.get("/api/bills/:id/pdf", (req, res) => {
  const billId = req.params.id;
  if (!isPositiveInteger(billId)) {
    return res.status(400).json({ message: "Invalid bill ID." });
  }

  const sql = `
    SELECT bills.bill_id, bills.amount, bills.payment_status,
      patients.patient_name, doctors.doctor_name,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time
    FROM bills
    JOIN appointments ON appointments.appointment_id = bills.appointment_id
    JOIN patients ON patients.patient_id = appointments.patient_id
    JOIN doctors ON doctors.doctor_id = appointments.doctor_id
    WHERE bills.bill_id = ?
  `;
  db.query(sql, [billId], (error, results) => {
    if (error) return databaseError(res, error);
    if (results.length === 0) {
      return res.status(404).json({ message: "Bill not found." });
    }
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=city-hospital-bill-${billId}.pdf`,
    });
    res.send(createBillPdf(results[0]));
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
