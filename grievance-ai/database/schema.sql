-- AI-Powered Grievance Lodging & Tracking System
-- MySQL Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS grievance_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grievance_ai;

-- ---------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- Users (role: citizen | department | admin)
-- department_id links a department-role user to their department
-- ---------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(64) UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  picture VARCHAR(512),
  role ENUM('citizen','department','admin') NOT NULL DEFAULT 'citizen',
  department_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Complaints
-- duplicate_id points to the "master" complaint when AI detects a duplicate
-- ---------------------------------------------------------------
CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80),
  department_id INT NULL,
  priority ENUM('Low','Medium','High','Critical') DEFAULT NULL,
  status ENUM('Submitted','AI Processing','Assigned','Accepted','In Progress','Resolved','Rejected','Closed')
    NOT NULL DEFAULT 'Submitted',
  summary TEXT,
  duplicate_id INT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicate_id) REFERENCES complaints(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_department (department_id),
  INDEX idx_user (user_id)
);

-- ---------------------------------------------------------------
-- Status history (audit trail of every status change)
-- ---------------------------------------------------------------
CREATE TABLE status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  updated_by INT NULL,
  note VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Chatbot history
-- ---------------------------------------------------------------
CREATE TABLE chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- Seed departments
-- ---------------------------------------------------------------
INSERT INTO departments (department_name, email) VALUES
  ('Electricity Department', 'electricity@city.gov.in'),
  ('Water Supply Department', 'water@city.gov.in'),
  ('Sanitation Department', 'sanitation@city.gov.in'),
  ('Roads & Infrastructure', 'roads@city.gov.in'),
  ('Public Health Department', 'health@city.gov.in'),
  ('Gas & Fire Safety', 'firesafety@city.gov.in'),
  ('Parks & Environment', 'parks@city.gov.in'),
  ('General Administration', 'admin@city.gov.in');

-- To promote a user to admin after their first Google login:
--   UPDATE users SET role='admin' WHERE email='your-admin@gmail.com';
-- To create a department officer:
--   UPDATE users SET role='department', department_id=3 WHERE email='officer@gmail.com';
