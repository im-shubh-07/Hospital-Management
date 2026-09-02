const express = require("express");
const db = require("./config/db");

const app = express();
const PORT = 5001;
const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Cancelled"];

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

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
      appointments.status
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.patient_id
    JOIN doctors ON appointments.doctor_id = doctors.doctor_id
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
      appointments.status
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.patient_id
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
      appointments.status
    FROM appointments
    JOIN doctors ON appointments.doctor_id = doctors.doctor_id
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
  const sql = `
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [patient_id, doctor_id, appointment_date, appointment_time, status],
    (error, results) => {
      if (error) {
        databaseError(res, error);
      } else {
        res.json({
          message: "Appointment added successfully",
          appointment_id: results.insertId,
        });
      }
    },
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
