-- D1 SQLite schema for Vacation Manager

DROP TABLE IF EXISTS vacation_requests;
DROP TABLE IF EXISTS vacation_users;
DROP TABLE IF EXISTS vacation_announcements;

CREATE TABLE vacation_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  annual_quota INTEGER DEFAULT 14,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE vacation_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES vacation_users(id) ON DELETE CASCADE,
  employee_name TEXT,
  employee_id TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE vacation_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Default users
INSERT INTO vacation_users (id, name, username, password, role, annual_quota)
VALUES ('admin-id', 'מנהל המערכת', 'admin', '123', 'admin', 14);

INSERT INTO vacation_users (id, name, username, password, role, annual_quota)
VALUES ('employee-id', 'עובד דוגמה', 'employee', '123', 'employee', 14);
