-- City Hospital Management System database
-- Import this file in MySQL Workbench or phpMyAdmin before running the app.

CREATE DATABASE IF NOT EXISTS city_hospital;
USE city_hospital;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(50) NOT NULL,
  PRIMARY KEY (admin_id),
  UNIQUE KEY unique_admin_username (username)
);

CREATE TABLE IF NOT EXISTS departments (
  department_id INT NOT NULL AUTO_INCREMENT,
  department_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (department_id)
);

CREATE TABLE IF NOT EXISTS doctors (
  doctor_id INT NOT NULL AUTO_INCREMENT,
  doctor_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  department_id INT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL,
  password VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (doctor_id),
  UNIQUE KEY unique_doctor_username (username),
  CONSTRAINT doctors_department_fk
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id INT NOT NULL AUTO_INCREMENT,
  patient_name VARCHAR(100) NOT NULL,
  age INT DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL,
  password VARCHAR(50) DEFAULT NULL,
  blood_group VARCHAR(10) DEFAULT NULL,
  allergies VARCHAR(255) DEFAULT NULL,
  medical_history TEXT DEFAULT NULL,
  emergency_contact VARCHAR(100) DEFAULT NULL,
  emergency_phone VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (patient_id),
  UNIQUE KEY unique_patient_username (username)
);

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_date DATE DEFAULT NULL,
  appointment_time TIME DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'Pending',
  PRIMARY KEY (appointment_id),
  CONSTRAINT appointments_patient_fk
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT appointments_doctor_fk
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
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
