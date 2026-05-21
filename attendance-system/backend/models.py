import pymysql
from flask import current_app, g
import bcrypt
from datetime import datetime
import calendar

def get_db():
    if 'db' not in g:
        g.db = pymysql.connect(
            host=current_app.config['MYSQL_HOST'],
            user=current_app.config['MYSQL_USER'],
            password=current_app.config['MYSQL_PASSWORD'],
            database=current_app.config['MYSQL_DB'],
            cursorclass=pymysql.cursors.DictCursor
        )
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    cursor = db.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_code VARCHAR(20) UNIQUE NOT NULL,
            subject_name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roll_number VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(150) NOT NULL,
            parent_contact VARCHAR(15) NOT NULL,
            class_division VARCHAR(20) NOT NULL,
            email VARCHAR(150),
            face_encoding TEXT,
            image_path VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetable (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day_of_week VARCHAR(10) NOT NULL,
            subject_id INT NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            lecture_number INT NOT NULL,
            class_division VARCHAR(20) NOT NULL,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            UNIQUE KEY unique_slot (day_of_week, start_time, class_division)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_id INT NOT NULL,
            lecture_number INT NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            status ENUM('present', 'absent') NOT NULL,
            confidence_score DECIMAL(5,2),
            marked_by VARCHAR(20) DEFAULT 'face_recognition',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            UNIQUE KEY unique_attendance (student_id, subject_id, lecture_number, date)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sms_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            parent_contact VARCHAR(15) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'sent',
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            lecture_date DATE NOT NULL,
            subject_id INT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recess_times (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day_of_week VARCHAR(10) NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL
        )
    """)

    cursor.execute("SELECT COUNT(*) as cnt FROM admins")
    if cursor.fetchone()['cnt'] == 0:
        hashed = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            "INSERT INTO admins (username, email, password_hash) VALUES (%s, %s, %s)",
            ('admin', 'admin@attendance.com', hashed.decode('utf-8'))
        )

    cursor.execute("SELECT COUNT(*) as cnt FROM subjects")
    if cursor.fetchone()['cnt'] == 0:
        default_subjects = [
            ('MATH101', 'Mathematics'),
            ('PHY101', 'Physics'),
            ('CS101', 'Python Programming'),
            ('ENG101', 'English'),
            ('DB101', 'Database Management')
        ]
        cursor.executemany(
            "INSERT INTO subjects (subject_code, subject_name) VALUES (%s, %s)",
            default_subjects
        )

    db.commit()
    cursor.close()

class Admin:
    @staticmethod
    def authenticate(username, password):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM admins WHERE username = %s", (username,))
        admin = cursor.fetchone()
        cursor.close()
        if admin and bcrypt.checkpw(password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
            return admin
        return None

    @staticmethod
    def get_by_id(admin_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, username, email, created_at FROM admins WHERE id = %s", (admin_id,))
        admin = cursor.fetchone()
        cursor.close()
        return admin

class Subject:
    @staticmethod
    def get_all():
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM subjects ORDER BY subject_name")
        subjects = cursor.fetchall()
        cursor.close()
        return subjects

    @staticmethod
    def get_by_id(subject_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM subjects WHERE id = %s", (subject_id,))
        subject = cursor.fetchone()
        cursor.close()
        return subject

    @staticmethod
    def create(subject_code, subject_name):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO subjects (subject_code, subject_name) VALUES (%s, %s)",
            (subject_code, subject_name)
        )
        db.commit()
        cursor.close()
        return cursor.lastrowid

    @staticmethod
    def delete(subject_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM subjects WHERE id = %s", (subject_id,))
        db.commit()
        cursor.close()

class Student:
    @staticmethod
    def get_all():
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM students ORDER BY roll_number")
        students = cursor.fetchall()
        cursor.close()
        return students

    @staticmethod
    def get_by_id(student_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        cursor.close()
        return student

    @staticmethod
    def get_by_roll(roll_number):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM students WHERE roll_number = %s", (roll_number,))
        student = cursor.fetchone()
        cursor.close()
        return student

    @staticmethod
    def create(roll_number, name, parent_contact, class_division, email=None):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO students (roll_number, name, parent_contact, class_division, email) VALUES (%s, %s, %s, %s, %s)",
            (roll_number, name, parent_contact, class_division, email)
        )
        db.commit()
        student_id = cursor.lastrowid
        cursor.close()
        return student_id

    @staticmethod
    def update(student_id, roll_number, name, parent_contact, class_division, email=None):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE students SET roll_number=%s, name=%s, parent_contact=%s, class_division=%s, email=%s WHERE id=%s",
            (roll_number, name, parent_contact, class_division, email, student_id)
        )
        db.commit()
        cursor.close()

    @staticmethod
    def update_face_encoding(student_id, encoding):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE students SET face_encoding = %s WHERE id = %s",
            (encoding, student_id)
        )
        db.commit()
        cursor.close()

    @staticmethod
    def update_image_path(student_id, path):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE students SET image_path = %s WHERE id = %s",
            (path, student_id)
        )
        db.commit()
        cursor.close()

    @staticmethod
    def delete(student_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        db.commit()
        cursor.close()

    @staticmethod
    def search(query):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM students WHERE name LIKE %s OR roll_number LIKE %s OR class_division LIKE %s",
            (f'%{query}%', f'%{query}%', f'%{query}%')
        )
        students = cursor.fetchall()
        cursor.close()
        return students

    @staticmethod
    def get_by_class(class_division):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM students WHERE class_division = %s ORDER BY roll_number", (class_division,))
        students = cursor.fetchall()
        cursor.close()
        return students

class Timetable:
    @staticmethod
    def get_all():
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT t.*, s.subject_name, s.subject_code
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            ORDER BY FIELD(t.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'),
                     t.start_time
        """)
        entries = cursor.fetchall()
        cursor.close()
        return entries

    @staticmethod
    def get_by_day(day):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT t.*, s.subject_name, s.subject_code
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.day_of_week = %s
            ORDER BY t.start_time
        """, (day,))
        entries = cursor.fetchall()
        cursor.close()
        return entries

    @staticmethod
    def get_current_lecture(class_division=None):
        db = get_db()
        cursor = db.cursor()
        now = datetime.now()
        day_name = calendar.day_name[now.weekday()]
        current_time = now.strftime('%H:%M:%S')

        query = """
            SELECT t.*, s.subject_name, s.subject_code
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.day_of_week = %s
            AND t.start_time <= %s
            AND t.end_time >= %s
        """
        params = [day_name, current_time, current_time]

        if class_division:
            query += " AND t.class_division = %s"
            params.append(class_division)

        cursor.execute(query, params)
        lecture = cursor.fetchone()
        cursor.close()

        if lecture:
            cursor = db.cursor()
            cursor.execute(
                "SELECT * FROM recess_times WHERE day_of_week = %s AND start_time <= %s AND end_time >= %s",
                (day_name, current_time, current_time)
            )
            recess = cursor.fetchone()
            cursor.close()
            if recess:
                return None

        return lecture

    @staticmethod
    def get_by_id(timetable_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT t.*, s.subject_name, s.subject_code
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.id = %s
        """, (timetable_id,))
        entry = cursor.fetchone()
        cursor.close()
        return entry

    @staticmethod
    def create(day, subject_id, start_time, end_time, lecture_number, class_division):
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO timetable (day_of_week, subject_id, start_time, end_time, lecture_number, class_division) VALUES (%s, %s, %s, %s, %s, %s)",
            (day, subject_id, start_time, end_time, lecture_number, class_division)
        )
        db.commit()
        cursor.close()

    @staticmethod
    def delete(timetable_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM timetable WHERE id = %s", (timetable_id,))
        db.commit()
        cursor.close()

    @staticmethod
    def delete_by_id(timetable_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM timetable WHERE id = %s", (timetable_id,))
        db.commit()
        cursor.close()

class Attendance:
    @staticmethod
    def mark(student_id, subject_id, lecture_number, status, confidence=None):
        db = get_db()
        cursor = db.cursor()
        today = datetime.now().date()
        now_time = datetime.now().strftime('%H:%M:%S')

        cursor.execute(
            "SELECT * FROM attendance WHERE student_id = %s AND subject_id = %s AND lecture_number = %s AND date = %s",
            (student_id, subject_id, lecture_number, today)
        )
        existing = cursor.fetchone()

        if existing:
            cursor.close()
            return False

        cursor.execute(
            "INSERT INTO attendance (student_id, subject_id, lecture_number, date, time, status, confidence_score) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (student_id, subject_id, lecture_number, today, now_time, status, confidence)
        )
        db.commit()
        cursor.close()
        return True

    @staticmethod
    def get_today_attendance(subject_id=None, lecture_number=None, class_division=None):
        db = get_db()
        cursor = db.cursor()
        today = datetime.now().date()
        query = """
            SELECT a.*, s.name, s.roll_number, s.class_division, sub.subject_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.date = %s
        """
        params = [today]
        if subject_id:
            query += " AND a.subject_id = %s"
            params.append(subject_id)
        if lecture_number:
            query += " AND a.lecture_number = %s"
            params.append(lecture_number)
        if class_division:
            query += " AND s.class_division = %s"
            params.append(class_division)
        query += " ORDER BY s.roll_number"
        cursor.execute(query, params)
        records = cursor.fetchall()
        cursor.close()
        return records

    @staticmethod
    def get_by_student(student_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT a.*, sub.subject_name, sub.subject_code
            FROM attendance a
            JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.student_id = %s
            ORDER BY a.date DESC, a.time DESC
        """, (student_id,))
        records = cursor.fetchall()
        cursor.close()
        return records

    @staticmethod
    def get_by_date_range(start_date, end_date):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            SELECT a.*, s.name, s.roll_number, s.class_division, sub.subject_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.date BETWEEN %s AND %s
            ORDER BY a.date DESC, s.roll_number
        """, (start_date, end_date))
        records = cursor.fetchall()
        cursor.close()
        return records

    @staticmethod
    def get_by_subject(subject_id, start_date=None, end_date=None):
        db = get_db()
        cursor = db.cursor()
        query = """
            SELECT a.*, s.name, s.roll_number, s.class_division
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.subject_id = %s
        """
        params = [subject_id]
        if start_date:
            query += " AND a.date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND a.date <= %s"
            params.append(end_date)
        query += " ORDER BY a.date DESC, s.roll_number"
        cursor.execute(query, params)
        records = cursor.fetchall()
        cursor.close()
        return records

    @staticmethod
    def get_dashboard_stats():
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM students")
        total_students = cursor.fetchone()['total']
        today = datetime.now().date()
        cursor.execute(
            "SELECT COUNT(DISTINCT student_id) as present FROM attendance WHERE date = %s AND status = 'present'",
            (today,)
        )
        present = cursor.fetchone()['present']
        absent = total_students - present
        percentage = (present / total_students * 100) if total_students > 0 else 0
        cursor.close()
        return {
            'total_students': total_students,
            'present': present,
            'absent': absent,
            'percentage': round(percentage, 2)
        }

    @staticmethod
    def get_subject_wise_attendance(start_date=None, end_date=None):
        db = get_db()
        cursor = db.cursor()
        query = """
            SELECT sub.id, sub.subject_name, sub.subject_code,
                   COUNT(DISTINCT a.date) as total_classes,
                   COUNT(DISTINCT CASE WHEN a.status = 'present' THEN CONCAT(a.student_id, '_', a.date) END) as total_present
            FROM subjects sub
            LEFT JOIN attendance a ON sub.id = a.subject_id
        """
        params = []
        if start_date:
            query += " AND a.date >= %s" if 'WHERE' in query else " WHERE a.date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND a.date <= %s" if 'WHERE' in query else " WHERE a.date <= %s"
            params.append(end_date)
        query += " GROUP BY sub.id, sub.subject_name"
        cursor.execute(query, params)
        stats = cursor.fetchall()
        cursor.close()
        return stats

    @staticmethod
    def get_absent_students_for_lecture(subject_id, lecture_number):
        db = get_db()
        cursor = db.cursor()
        today = datetime.now().date()
        cursor.execute("""
            SELECT s.* FROM students s
            WHERE s.id NOT IN (
                SELECT a.student_id FROM attendance a
                WHERE a.subject_id = %s AND a.lecture_number = %s AND a.date = %s AND a.status = 'present'
            )
            AND s.class_division IN (
                SELECT DISTINCT t.class_division FROM timetable t
                WHERE t.subject_id = %s AND t.lecture_number = %s
            )
        """, (subject_id, lecture_number, today, subject_id, lecture_number))
        students = cursor.fetchall()
        cursor.close()
        return students
