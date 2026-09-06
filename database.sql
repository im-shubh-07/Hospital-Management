CREATE DATABASE IF NOT EXISTS city_hospital;
USE city_hospital;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS doctors (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) DEFAULT 'OPD Clinic, Room 102, City Hospital',
  department_id INT NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,

  CONSTRAINT doctors_department_fk
    FOREIGN KEY (department_id)
    REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  blood_group VARCHAR(10),
  allergies VARCHAR(255),
  medical_history TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS dependants (
  patient_id INT NOT NULL,
  dependant_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  date_of_birth DATE,

  PRIMARY KEY (patient_id, dependant_name),

  CONSTRAINT dependants_patient_fk
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled')
    NOT NULL DEFAULT 'Pending',

  CONSTRAINT appointments_patient_fk
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id),

  CONSTRAINT appointments_doctor_fk
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(doctor_id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE,
  diagnosis TEXT NOT NULL,
  medicines TEXT NOT NULL,
  instructions TEXT,
  prescribed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT prescriptions_appointment_fk
    FOREIGN KEY (appointment_id)
    REFERENCES appointments(appointment_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bills (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('Unpaid', 'Paid')
    NOT NULL DEFAULT 'Unpaid',
  billed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT bills_appointment_fk
    FOREIGN KEY (appointment_id)
    REFERENCES appointments(appointment_id)
    ON DELETE CASCADE
);

-- Demo credentials and starter data
INSERT INTO admins (username, password)
SELECT 'admin', 'admin123'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');

INSERT INTO departments (department_name, location)
SELECT 'Cardiology', 'Floor 1'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Cardiology');

INSERT INTO departments (department_name, location)
SELECT 'Neurology', 'Floor 2'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Neurology');

INSERT INTO departments (department_name, location)
SELECT 'Orthopedics', 'Floor 3'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Orthopedics');

INSERT INTO departments (department_name, location)
SELECT 'General Medicine', 'Floor 1'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'General Medicine');

INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
SELECT 'Dr. Amit Sharma', 'Heart Specialist', '9876543210', department_id, 'amit', 'amit123'
FROM departments WHERE department_name = 'Cardiology'
  AND NOT EXISTS (SELECT 1 FROM doctors WHERE username = 'amit');

INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
SELECT 'Dr. Neha Verma', 'Brain Specialist', '9876543211', department_id, 'neha', 'neha123'
FROM departments WHERE department_name = 'Neurology'
  AND NOT EXISTS (SELECT 1 FROM doctors WHERE username = 'neha');

INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
SELECT 'Dr. Raj Mehta', 'Bone Specialist', '9876543212', department_id, 'raj', 'raj123'
FROM departments WHERE department_name = 'Orthopedics'
  AND NOT EXISTS (SELECT 1 FROM doctors WHERE username = 'raj');

INSERT INTO doctors (doctor_name, specialization, phone, department_id, username, password)
SELECT 'Dr. Priya Singh', 'General Physician', '9876543213', department_id, 'priya', 'priya123'
FROM departments WHERE department_name = 'General Medicine'
  AND NOT EXISTS (SELECT 1 FROM doctors WHERE username = 'priya');

INSERT INTO patients (
  patient_name, age, gender, phone, address, username, password,
  blood_group, allergies, medical_history, emergency_contact, emergency_phone
)
SELECT 'Aman Kumar', 22, 'Male', '778995', 'Delhi', 'aman', 'aman123',
  'O+', 'None', 'No known medical history', 'Ravi Kumar', '9876500000'
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE username = 'aman');
