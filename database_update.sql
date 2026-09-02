-- Run this once on the city_hospital database if the fields do not already exist.
ALTER TABLE patients
  ADD COLUMN blood_group VARCHAR(10) NULL,
  ADD COLUMN allergies VARCHAR(255) NULL,
  ADD COLUMN medical_history TEXT NULL,
  ADD COLUMN emergency_contact VARCHAR(100) NULL,
  ADD COLUMN emergency_phone VARCHAR(20) NULL;
