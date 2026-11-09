# College Resource Management System

A beginner-friendly full-stack project using React + Vite, Node.js + Express, and MySQL.

## Features
- Separate Student, Faculty, and Admin roles
- Registration and login with hashed passwords and JWT authentication
- Fixed seven-period college schedule with breaks and lunch
- Resource list: CC1–CC8 and SH1–SH2
- Student and faculty resource booking
- Faculty can cancel only their own future/current bookings
- Faculty cancellation updates the synchronized timetable and makes the resource available
- Cancellation notifications are broadcast to all students, all other faculty, and admins
- Booking conflict prevention (same resource/date/period)
- Booking history and notification read status
- Admin can manage resources, timetable entries, and view all bookings
- Timetable displays faculty booking names dynamically

## Requirements
- Node.js 18+
- MySQL 8+
- VS Code

## 1. Database setup
Open MySQL Workbench and run:

```sql
CREATE DATABASE college_resource_management;
```

Then open `database/schema.sql`, select the `college_resource_management` schema, and execute the complete file.

## 2. Backend setup
Open a terminal in `backend`:

```bash
npm install
```

Copy `.env.example` to `.env`, then edit `.env` and enter your MySQL password.

```bash
npm run dev
```

Backend runs at `http://127.0.0.1:5000`.

## 3. Create the first admin
First register a normal account from the website. Then run this in MySQL Workbench, replacing `your_username`:

```sql
USE college_resource_management;
UPDATE users SET role='admin' WHERE username='your_username';
```

Log out and log in again. The account will have the Admin dashboard.

## 4. Frontend setup
Open another terminal in `frontend`:

```bash
npm install
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.

Keep both backend and frontend terminals running.

## 5. How the roles work
- Student: view resources/timetable, book available resources, see notifications and own bookings.
- Faculty: same booking features; can cancel only their own bookings. A cancellation broadcasts notifications to every student, every other faculty member, and admins.
- Admin: manage resources and timetable, view all bookings and cancellations.

## 6. Timings
1: 08:45–09:35
2: 09:35–10:25
Break: 10:25–10:45
3: 10:45–11:35
4: 11:35–12:25
Lunch: 12:25–13:25
5: 13:25–14:15
6: 14:15–15:05
Break: 15:05–15:25
7: 15:25–16:15

The schedule is stored in `periods` and can be changed by editing the database seed data.

## Notes
- Notifications are in-app notifications; email/SMS/push notifications are not configured.
- Faculty cancellation is restricted to the faculty member who made the booking.
- Admin accounts should be created/assigned by a trusted project administrator.
