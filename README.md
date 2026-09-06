# 🏥 City Hospital Management System

A full-stack Hospital Management Web Application built with **Node.js, Express, MySQL, and Modern Vanilla JavaScript/CSS**.

---

## 🌟 Key Features

- **Multi-Role Authentication**: Secure role-based login for **Admin**, **Doctor**, and **Patient** with password hashing (cryptjs).
- **Doctor Portal**: Dashboard to view assigned appointments, manage patient consultations, and update doctor profiles.
- **Patient Portal**: Profile management, medical history, appointment booking with real-time slot availability, and download digital prescriptions (PDF).
- **Admin Panel**: Manage hospital departments, doctors, patients, billing, and overall appointments.
- **Smart Search & Filters**: Search doctors by symptoms, specialization, or department.

---

## 🔐 Demo Login Credentials

> **Note:** Passwords are case-sensitive. The first letter is capitalized (e.g. Admin@123).

### 1. Admins (Role: Admin)
| Username | Password (Case-Sensitive) | Role |
|---|---|---|
| dmin | Admin@123 | Default Admin |
| shubham | Shubham@123 | Admin |
| 
aveen | Naveen@123 | Admin |
| golu | Golu@123 | Admin |

### 2. Doctors (Role: Doctor)
| Doctor Name | Department | Username | Password (Case-Sensitive) |
|---|---|---|---|
| Dr. Amit Sharma | Cardiology | mit | Amit@123 |
| Dr. Neha Verma | Neurology | 
eha | Neha@123 |
| Dr. Raj Mehta | Orthopedics | aj | Raj@123 |
| Dr. Priya Singh | General Medicine | priya | Priya@123 |
| Dr. Ajay Kumar | Neurology | Ajay | Ajay@123 |
| Dr Himanshu kumar | Cardiology | Himanshu | Himanshu@123 |

### 3. Patients (Role: Patient)
| Patient Name | Username | Password (Case-Sensitive) |
|---|---|---|
| Rohit Kumar | ohit | Rohit@123 |
| Aman Kumar | man | man123 |
| Gaurav Kumar | Gaurav | Gaurav@123 |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MySQL](https://www.mysql.com/) or TiDB Server

### 2. Installation
`ash
git clone https://github.com/im-shubh-07/Hospital-Management.git
cd Hospital-Management
npm install
`

### 3. Database Setup
Import the database schema and seed data into your MySQL server:
`ash
mysql -u root -p < database.sql
`

### 4. Run the Server
`ash
npm start
`
Server will start on http://localhost:5001. Open http://localhost:5001/login.html to begin!