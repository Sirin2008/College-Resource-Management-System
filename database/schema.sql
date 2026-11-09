USE college_resource_management;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('student','faculty','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_code VARCHAR(20) NOT NULL UNIQUE,
  resource_name VARCHAR(120) NOT NULL,
  resource_type ENUM('Computer Lab','Seminar Hall') NOT NULL DEFAULT 'Computer Lab',
  location VARCHAR(120) DEFAULT '',
  capacity INT NOT NULL DEFAULT 30,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS periods (
  period_no TINYINT PRIMARY KEY,
  label VARCHAR(30) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  day_name ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  period_no TINYINT NOT NULL,
  class_name VARCHAR(100) DEFAULT '',
  notes VARCHAR(255) DEFAULT '',
  UNIQUE KEY unique_resource_slot(resource_id, day_name, period_no),
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (period_no) REFERENCES periods(period_no)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id INT NOT NULL,
  booking_date DATE NOT NULL,
  period_no TINYINT NOT NULL,
  purpose VARCHAR(255) DEFAULT '',
  status ENUM('Booked','Cancelled') NOT NULL DEFAULT 'Booked',
  cancelled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_active_slot(resource_id, booking_date, period_no, status),
  FOREIGN KEY (resource_id) REFERENCES resources(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (period_no) REFERENCES periods(period_no)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO periods(period_no,label,start_time,end_time) VALUES
(1,'1st Period','08:45:00','09:35:00'),
(2,'2nd Period','09:35:00','10:25:00'),
(3,'3rd Period','10:45:00','11:35:00'),
(4,'4th Period','11:35:00','12:25:00'),
(5,'5th Period','13:25:00','14:15:00'),
(6,'6th Period','14:15:00','15:05:00'),
(7,'7th Period','15:25:00','16:15:00');

INSERT IGNORE INTO resources(resource_code,resource_name,resource_type,location,capacity) VALUES
('CC1','Computer Centre 1','Computer Lab','Block A',60),
('CC2','Computer Centre 2','Computer Lab','Block A',60),
('CC3','Computer Centre 3','Computer Lab','Block A',60),
('CC4','Computer Centre 4','Computer Lab','Block A',60),
('CC5','Computer Centre 5','Computer Lab','Block B',60),
('CC6','Computer Centre 6','Computer Lab','Block B',60),
('CC7','Computer Centre 7','Computer Lab','Block B',60),
('CC8','Computer Centre 8','Computer Lab','Block B',60),
('SH1','Seminar Hall 1','Seminar Hall','Main Block',150),
('SH2','Seminar Hall 2','Seminar Hall','Main Block',120);
