const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./config/db");

const app = express();
// const PORT = 5001;
const PORT = process.env.PORT || 5001;
const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function buildPdfDocument(streamCommands) {
  const streamContent = streamCommands.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf8");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${offsets.length - 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function createPrescriptionPdf(data) {
  const c = [];
  // Header navy banner
  c.push("0.06 0.16 0.26 rg 0 710 612 82 re f");
  c.push("0.01 0.52 0.78 rg 0 706 612 4 re f");

  // Hospital Title & Subtitle
  c.push("1 1 1 rg BT /F2 20 Tf 40 755 Td (" + escapePdfText("CITY HOSPITAL & RESEARCH CENTRE") + ") Tj ET");
  c.push("0.85 0.9 0.95 rg BT /F1 9.5 Tf 40 735 Td (" + escapePdfText("24/7 Emergency Helpline: 108 / +91 98765-00000 | NABH Accredited Multispecialty") + ") Tj ET");
  c.push("0.85 0.9 0.95 rg BT /F1 9.5 Tf 40 720 Td (" + escapePdfText("Department of " + (data.department_name || "Clinical Medicine")) + ") Tj ET");

  // Patient Info Box
  c.push("0.96 0.97 0.99 rg 40 605 532 85 re f");
  c.push("0.85 0.9 0.95 RG 1 w 40 605 532 85 re s");
  c.push("0.06 0.16 0.26 rg BT /F2 11 Tf 54 670 Td (" + escapePdfText("PATIENT DETAILS") + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 650 Td (" + escapePdfText("Patient Name: " + (data.patient_name || "N/A")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 632 Td (" + escapePdfText("Age / Gender: " + (data.age ? data.age + " Yrs" : "N/A") + " / " + (data.gender || "N/A") + "    Phone: " + (data.phone || "N/A")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 615 Td (" + escapePdfText("Date: " + (data.appointment_date || "N/A") + "    Time Slot: " + (data.appointment_time || "N/A")) + ") Tj ET");

  c.push("0.06 0.16 0.26 rg BT /F2 11 Tf 320 670 Td (" + escapePdfText("CONSULTING SPECIALIST") + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 650 Td (" + escapePdfText("Doctor: " + (data.doctor_name || "N/A")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 632 Td (" + escapePdfText("Specialization: " + (data.specialization || "Specialist")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 615 Td (" + escapePdfText("Prescription ID: RX-" + (data.prescription_id || data.appointment_id || "101")) + ") Tj ET");

  // Diagnosis Section
  c.push("0.06 0.16 0.26 rg BT /F2 12 Tf 40 575 Td (" + escapePdfText("1. CLINICAL DIAGNOSIS") + ") Tj ET");
  c.push("0.97 0.98 0.99 rg 40 535 532 30 re f");
  c.push("0.85 0.9 0.95 RG 1 w 40 535 532 30 re s");
  const diagnosisText = String(data.diagnosis || "Routine Clinical Examination").substring(0, 80);
  c.push("0.1 0.2 0.35 rg BT /F2 10.5 Tf 54 546 Td (" + escapePdfText(diagnosisText) + ") Tj ET");

  // Medicines Section
  c.push("0.06 0.16 0.26 rg BT /F2 12 Tf 40 505 Td (" + escapePdfText("2. RX - PRESCRIBED MEDICINES & DOSAGE") + ") Tj ET");
  c.push("0.91 0.95 0.98 rg 40 470 532 24 re f");
  c.push("0.06 0.16 0.26 rg BT /F2 9.5 Tf 54 477 Td (" + escapePdfText("MEDICINES & INSTRUCTIONS") + ") Tj ET");

  const medLines = String(data.medicines || "No specific medications prescribed.")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  let yPos = 445;
  medLines.forEach((med, idx) => {
    c.push("0.98 0.98 0.99 rg 40 " + (yPos - 4) + " 532 20 re f");
    c.push("0.88 0.91 0.95 RG 0.5 w 40 " + (yPos - 4) + " 532 20 re s");
    c.push("0.1 0.2 0.3 rg BT /F1 9.5 Tf 54 " + yPos + " Td (" + escapePdfText((idx + 1) + ". " + med.substring(0, 80)) + ") Tj ET");
    yPos -= 24;
  });

  // Instructions Section
  yPos -= 10;
  c.push("0.06 0.16 0.26 rg BT /F2 12 Tf 40 " + yPos + " Td (" + escapePdfText("3. ADVICE & SPECIAL INSTRUCTIONS") + ") Tj ET");
  yPos -= 36;
  c.push("0.97 0.98 0.99 rg 40 " + yPos + " 532 30 re f");
  c.push("0.85 0.9 0.95 RG 1 w 40 " + yPos + " 532 30 re s");
  const adviceText = String(data.instructions || "Drink plenty of water, take adequate rest, and review after 5 days.").substring(0, 85);
  c.push("0.2 0.25 0.3 rg BT /F1 9.5 Tf 54 " + (yPos + 10) + " Td (" + escapePdfText(adviceText) + ") Tj ET");

  // Bottom Divider & Signatures
  c.push("0.8 0.85 0.9 RG 1 w 40 100 532 0 re s");
  c.push("0.4 0.45 0.5 rg BT /F1 8 Tf 40 85 Td (" + escapePdfText("This is an official computer-generated medical prescription issued by City Hospital.") + ") Tj ET");
  c.push("0.4 0.45 0.5 rg BT /F1 8 Tf 40 72 Td (" + escapePdfText("Valid for dispensing at all registered hospital and retail pharmacies.") + ") Tj ET");
  c.push("0.06 0.16 0.26 rg BT /F2 10.5 Tf 380 85 Td (" + escapePdfText(data.doctor_name || "Doctor Signatory") + ") Tj ET");
  c.push("0.3 0.35 0.4 rg BT /F1 8.5 Tf 380 72 Td (" + escapePdfText("Verified Medical Practitioner - Seal & Sign") + ") Tj ET");

  return buildPdfDocument(c);
}

function createBillPdf(bill) {
  const c = [];
  // Top header navy rectangle
  c.push("0.06 0.16 0.26 rg 0 710 612 82 re f");
  c.push("0.01 0.52 0.78 rg 0 706 612 4 re f");

  c.push("1 1 1 rg BT /F2 20 Tf 40 755 Td (" + escapePdfText("CITY HOSPITAL & RESEARCH CENTRE") + ") Tj ET");
  c.push("0.85 0.9 0.95 rg BT /F1 9.5 Tf 40 735 Td (" + escapePdfText("OFFICIAL MEDICAL INVOICE & RECEIPT") + ") Tj ET");
  c.push("0.85 0.9 0.95 rg BT /F1 9.5 Tf 40 720 Td (" + escapePdfText("GSTIN: 27AABCC1234F1Z5 | Helpline: 108 / +91 98765-00000") + ") Tj ET");

  // Info Box
  c.push("0.96 0.97 0.99 rg 40 605 532 85 re f");
  c.push("0.85 0.9 0.95 RG 1 w 40 605 532 85 re s");
  c.push("0.06 0.16 0.26 rg BT /F2 11 Tf 54 670 Td (" + escapePdfText("PATIENT INVOICE TO") + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 650 Td (" + escapePdfText("Patient Name: " + (bill.patient_name || "N/A")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 632 Td (" + escapePdfText("Doctor: " + (bill.doctor_name || "N/A")) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 54 615 Td (" + escapePdfText("Appointment: " + (bill.appointment_date || "N/A") + " at " + (bill.appointment_time || "N/A")) + ") Tj ET");

  c.push("0.06 0.16 0.26 rg BT /F2 11 Tf 320 670 Td (" + escapePdfText("INVOICE SUMMARY") + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 650 Td (" + escapePdfText("Invoice No: INV-" + bill.bill_id) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 632 Td (" + escapePdfText("Billing Date: " + (bill.appointment_date || new Date().toISOString().split("T")[0])) + ") Tj ET");
  c.push("0.2 0.25 0.3 rg BT /F1 10 Tf 320 615 Td (" + escapePdfText("Payment Status: " + bill.payment_status) + ") Tj ET");

  // Charges Table
  c.push("0.06 0.16 0.26 rg BT /F2 12 Tf 40 575 Td (" + escapePdfText("BILLING BREAKDOWN") + ") Tj ET");
  c.push("0.91 0.95 0.98 rg 40 540 532 24 re f");
  c.push("0.06 0.16 0.26 rg BT /F2 9.5 Tf 54 547 Td (" + escapePdfText("DESCRIPTION") + ") Tj 350 0 Td (" + escapePdfText("AMOUNT (INR)") + ") Tj ET");

  const totalAmount = Number(bill.amount || 500);
  const consultFee = (totalAmount * 0.85).toFixed(2);
  const adminFee = (totalAmount * 0.15).toFixed(2);

  c.push("0.98 0.98 0.99 rg 40 514 532 24 re f");
  c.push("0.88 0.91 0.95 RG 0.5 w 40 514 532 24 re s");
  c.push("0.1 0.2 0.3 rg BT /F1 9.5 Tf 54 521 Td (" + escapePdfText("1. Specialist Doctor OPD Consultation") + ") Tj 350 0 Td (" + escapePdfText("INR " + consultFee) + ") Tj ET");

  c.push("0.98 0.98 0.99 rg 40 488 532 24 re f");
  c.push("0.88 0.91 0.95 RG 0.5 w 40 488 532 24 re s");
  c.push("0.1 0.2 0.3 rg BT /F1 9.5 Tf 54 495 Td (" + escapePdfText("2. Hospital Facility & Clinical Registration") + ") Tj 350 0 Td (" + escapePdfText("INR " + adminFee) + ") Tj ET");

  // Total Box
  c.push("0.93 0.96 0.99 rg 40 450 532 28 re f");
  c.push("0.01 0.52 0.78 RG 1.5 w 40 450 532 28 re s");
  c.push("0.06 0.16 0.26 rg BT /F2 11 Tf 54 458 Td (" + escapePdfText("TOTAL AMOUNT PAID / PAYABLE") + ") Tj 350 0 Td (" + escapePdfText("INR " + totalAmount.toFixed(2)) + ") Tj ET");

  // Payment Status Stamp Box
  const isPaid = String(bill.payment_status).toLowerCase() === "paid";
  if (isPaid) {
    c.push("0.92 0.99 0.95 rg 40 380 200 40 re f");
    c.push("0.05 0.59 0.41 RG 1.5 w 40 380 200 40 re s");
    c.push("0.02 0.45 0.31 rg BT /F2 13 Tf 58 393 Td (" + escapePdfText("[ PAID - THANK YOU ]") + ") Tj ET");
  } else {
    c.push("0.99 0.98 0.92 rg 40 380 200 40 re f");
    c.push("0.85 0.47 0.02 RG 1.5 w 40 380 200 40 re s");
    c.push("0.75 0.35 0.01 rg BT /F2 13 Tf 54 393 Td (" + escapePdfText("[ PAYMENT PENDING ]") + ") Tj ET");
  }

  // Footer & Signatures
  c.push("0.8 0.85 0.9 RG 1 w 40 100 532 0 re s");
  c.push("0.4 0.45 0.5 rg BT /F1 8 Tf 40 85 Td (" + escapePdfText("Official computer-generated receipt. City Hospital Management System.") + ") Tj ET");
  c.push("0.4 0.45 0.5 rg BT /F1 8 Tf 40 72 Td (" + escapePdfText("For queries, contact accounts@cityhospital.com or call +91 98765-00000.") + ") Tj ET");
  c.push("0.06 0.16 0.26 rg BT /F2 10.5 Tf 380 85 Td (" + escapePdfText("City Hospital Accounts Dept.") + ") Tj ET");
  c.push("0.3 0.35 0.4 rg BT /F1 8.5 Tf 380 72 Td (" + escapePdfText("Authorized Finance Signatory") + ") Tj ET");

  return buildPdfDocument(c);
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
      doctors.address,
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
      doctors.address,
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

app.get("/api/doctors/:id/booked-slots", (req, res) => {
  const doctorId = req.params.id;
  const { date } = req.query;

  if (!isPositiveInteger(doctorId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "Invalid doctor ID or date format." });
  }

  const sql = `
    SELECT TIME_FORMAT(appointment_time, '%H:%i') AS slot_time
    FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND status <> 'Cancelled'
  `;

  db.query(sql, [doctorId, date], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      const bookedSlots = results.map((row) => row.slot_time);
      res.json({ bookedSlots });
    }
  });
});

app.put("/api/doctors/:id/profile", (req, res) => {
  const doctorId = req.params.id;
  const { doctor_name, specialization, phone, address } = req.body;

  if (
    !isPositiveInteger(doctorId) ||
    ![doctor_name, specialization, phone].every(isNonEmptyString)
  ) {
    return res.status(400).json({ message: "Please provide valid doctor name, specialization, and phone." });
  }

  const docAddress = typeof address === "string" ? address.trim() : "";

  const sql = `
    UPDATE doctors
    SET doctor_name = ?, specialization = ?, phone = ?, address = ?
    WHERE doctor_id = ?
  `;

  db.query(sql, [doctor_name.trim(), specialization.trim(), phone.trim(), docAddress, doctorId], (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.affectedRows === 0) {
      res.status(404).json({ message: "Doctor not found." });
    } else {
      db.query(
        `SELECT doctor_id, doctor_name, specialization, phone, address, username, department_id FROM doctors WHERE doctor_id = ?`,
        [doctorId],
        (err, docResults) => {
          res.json({
            message: "Doctor profile & address updated successfully.",
            doctor: docResults && docResults[0] ? docResults[0] : null,
          });
        }
      );
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
      patients.phone AS patient_phone,
      doctors.doctor_name,
      doctors.specialization,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time,
      appointments.status,
      bills.bill_id,
      bills.amount AS bill_amount,
      bills.payment_status,
      prescriptions.prescription_id,
      prescriptions.diagnosis,
      prescriptions.medicines
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.patient_id
    JOIN doctors ON appointments.doctor_id = doctors.doctor_id
    LEFT JOIN bills ON bills.appointment_id = appointments.appointment_id
    LEFT JOIN prescriptions ON prescriptions.appointment_id = appointments.appointment_id
    ORDER BY appointments.appointment_date DESC, appointments.appointment_time DESC
  `;

  db.query(sql, (error, results) => {
    if (error) {
      databaseError(res, error);
    } else {
      res.json(results);
    }
  });
});

app.post("/api/patients", async (req, res) => {
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

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO patients (
        patient_name, age, gender, phone, address, username, password,
        blood_group, allergies, medical_history, emergency_contact, emergency_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        patient_name, age, gender, phone, address, username, hashedPassword,
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
  } catch (hashError) {
    res.status(500).json({ message: "Error hashing password" });
  }
});

app.post("/api/doctors", async (req, res) => {
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

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [doctor_name, specialization, phone, department_id, username, hashedPassword],
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
  } catch (hashError) {
    res.status(500).json({ message: "Error hashing password" });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const sql = "SELECT * FROM admins WHERE username = ?";

  db.query(sql, [username], async (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid admin username or password" });
    } else {
      const admin = results[0];
      const isMatch = (await bcrypt.compare(password, admin.password)) || password === admin.password;
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid admin username or password" });
      }
      if (password === admin.password) {
        const newHash = await bcrypt.hash(password, 10);
        db.query("UPDATE admins SET password = ? WHERE admin_id = ?", [newHash, admin.admin_id], (updateErr) => {
          if (updateErr) console.error("Admin password hash update error:", updateErr.message);
        });
      }
      res.json({ message: "Admin login successful", admin: { admin_id: admin.admin_id, username: admin.username } });
    }
  });
});

app.post("/api/doctor/login", (req, res) => {
  const { username, password } = req.body;
  if (![username, password].every(isNonEmptyString)) {
    return res.status(400).json({ message: "Username and password are required." });
  }
  const sql = "SELECT doctor_id, doctor_name, specialization, phone, address, username, password FROM doctors WHERE username = ?";

  db.query(sql, [username], async (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid doctor username or password" });
    } else {
      const doctor = results[0];
      const isMatch = (await bcrypt.compare(password, doctor.password)) || password === doctor.password;
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid doctor username or password" });
      }
      if (password === doctor.password) {
        const newHash = await bcrypt.hash(password, 10);
        db.query("UPDATE doctors SET password = ? WHERE doctor_id = ?", [newHash, doctor.doctor_id], (updateErr) => {
          if (updateErr) console.error("Doctor password hash update error:", updateErr.message);
        });
      }
      delete doctor.password;
      res.json({ message: "Doctor login successful", doctor });
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
      blood_group, allergies, medical_history, emergency_contact, emergency_phone, password
    FROM patients WHERE username = ?
  `;

  db.query(sql, [username], async (error, results) => {
    if (error) {
      databaseError(res, error);
    } else if (results.length === 0) {
      res.status(401).json({ message: "Invalid patient username or password" });
    } else {
      const patient = results[0];
      const isMatch = (await bcrypt.compare(password, patient.password)) || password === patient.password;
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid patient username or password" });
      }
      if (password === patient.password) {
        const newHash = await bcrypt.hash(password, 10);
        db.query("UPDATE patients SET password = ? WHERE patient_id = ?", [newHash, patient.patient_id], (updateErr) => {
          if (updateErr) console.error("Patient password hash update error:", updateErr.message);
        });
      }
      delete patient.password;
      res.json({ message: "Patient login successful", patient });
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
      SUM(status = 'Completed') AS completed_appointments,
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

app.get("/api/appointments/:id/prescription/pdf", (req, res) => {
  const appointmentId = req.params.id;
  if (!isPositiveInteger(appointmentId)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }

  const sql = `
    SELECT 
      prescriptions.prescription_id,
      prescriptions.diagnosis,
      prescriptions.medicines,
      prescriptions.instructions,
      prescriptions.created_at,
      patients.patient_name,
      patients.age,
      patients.gender,
      patients.phone,
      doctors.doctor_name,
      doctors.specialization,
      departments.department_name,
      DATE_FORMAT(appointments.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(appointments.appointment_time, '%H:%i') AS appointment_time
    FROM prescriptions
    JOIN appointments ON appointments.appointment_id = prescriptions.appointment_id
    JOIN patients ON patients.patient_id = appointments.patient_id
    JOIN doctors ON doctors.doctor_id = appointments.doctor_id
    LEFT JOIN departments ON departments.department_id = doctors.department_id
    WHERE appointments.appointment_id = ?
  `;

  db.query(sql, [appointmentId], (error, results) => {
    if (error) return databaseError(res, error);
    if (results.length === 0) {
      return res.status(404).json({ message: "Prescription not found for this appointment." });
    }
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescription-apt-${appointmentId}.pdf"`,
    });
    res.send(createPrescriptionPdf(results[0]));
  });
});

app.get("/api/appointments/:id/bill/pdf", (req, res) => {
  const appointmentId = req.params.id;
  if (!isPositiveInteger(appointmentId)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
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
    WHERE appointments.appointment_id = ?
  `;
  db.query(sql, [appointmentId], (error, results) => {
    if (error) return databaseError(res, error);
    if (results.length === 0) {
      return res.status(404).json({ message: "Bill not found for this appointment." });
    }
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="city-hospital-bill-${results[0].bill_id}.pdf"`,
    });
    res.send(createBillPdf(results[0]));
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
      "Content-Disposition": `inline; filename="city-hospital-bill-${billId}.pdf"`,
    });
    res.send(createBillPdf(results[0]));
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
