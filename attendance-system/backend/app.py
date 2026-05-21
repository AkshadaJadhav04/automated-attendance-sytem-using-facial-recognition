import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import base64
import json
import cv2
import numpy as np
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO

from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
import jwt
import bcrypt

from backend.config import Config
from backend.models import (
    init_db, close_db, get_db,
    Admin, Subject, Student, Timetable, Attendance
)
from backend.utils.face_utils import (
    detect_faces, get_face_encoding, compare_faces,
    encode_face_to_base64, base64_to_image, load_known_faces,
    recognize_face_lbph, train_lbph_model
)
from backend.utils.mask_detection import mask_detector
from backend.utils.sms_utils import send_absence_alert, log_sms, TWILIO_ENABLED
from backend.utils.report_utils import (
    generate_daily_report, generate_monthly_report,
    generate_student_report, generate_subject_report,
    generate_excel_report, generate_pdf_report
)

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True)

app.teardown_appcontext(close_db)

with app.app_context():
    init_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = Admin.get_by_id(data['admin_id'])
            if not current_user:
                return jsonify({'error': 'Admin not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    admin = Admin.authenticate(data.get('username', ''), data.get('password', ''))
    if admin:
        token = jwt.encode({
            'admin_id': admin['id'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        return jsonify({'token': token, 'admin': {'id': admin['id'], 'username': admin['username'], 'email': admin['email']}})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/check', methods=['GET'])
@token_required
def auth_check(current_user):
    return jsonify({'valid': True, 'admin': current_user})

@app.route('/api/students', methods=['GET'])
@token_required
def get_students(current_user):
    students = Student.get_all()
    return jsonify({'students': students})

@app.route('/api/students/search', methods=['GET'])
@token_required
def search_students(current_user):
    query = request.args.get('q', '')
    students = Student.search(query)
    return jsonify({'students': students})

@app.route('/api/students', methods=['POST'])
@token_required
def add_student(current_user):
    data = request.json
    existing = Student.get_by_roll(data.get('roll_number', ''))
    if existing:
        return jsonify({'error': 'Roll number already exists'}), 400
    student_id = Student.create(
        data['roll_number'], data['name'],
        data['parent_contact'], data['class_division'],
        data.get('email', '')
    )
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], data['roll_number']), exist_ok=True)
    return jsonify({'message': 'Student added successfully', 'student_id': student_id}), 201

@app.route('/api/students/<int:student_id>', methods=['PUT'])
@token_required
def update_student(current_user, student_id):
    data = request.json
    Student.update(
        student_id, data['roll_number'], data['name'],
        data['parent_contact'], data['class_division'],
        data.get('email', '')
    )
    return jsonify({'message': 'Student updated successfully'})

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@token_required
def delete_student(current_user, student_id):
    student = Student.get_by_id(student_id)
    if student:
        import shutil
        dataset_path = os.path.join(app.config['UPLOAD_FOLDER'], student['roll_number'])
        if os.path.exists(dataset_path):
            shutil.rmtree(dataset_path)
        Student.delete(student_id)
    return jsonify({'message': 'Student deleted successfully'})

@app.route('/api/students/<int:student_id>', methods=['GET'])
@token_required
def get_student(current_user, student_id):
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify({'student': student})

@app.route('/api/students/capture-samples', methods=['POST'])
@token_required
def capture_samples(current_user):
    data = request.json
    roll_number = data.get('roll_number')
    images = data.get('images', [])

    student = Student.get_by_roll(roll_number)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    student_dir = os.path.join(app.config['UPLOAD_FOLDER'], roll_number)
    os.makedirs(student_dir, exist_ok=True)

    encodings = []
    for i, img_data in enumerate(images):
        try:
            image = base64_to_image(img_data)
            faces, _ = detect_faces(image)
            if len(faces) > 0:
                face = faces[0]
                encoding = get_face_encoding(image, face)
                if encoding is not None:
                    encodings.append(encoding)
                face_img = image[face[1]:face[1]+face[3], face[0]:face[0]+face[2]]
                cv2.imwrite(os.path.join(student_dir, f"{i+1}.jpg"), face_img)
        except Exception as e:
            continue

    if encodings:
        avg_encoding = np.mean(encodings, axis=0).astype(np.float64)
        encoding_str = base64.b64encode(avg_encoding.tobytes()).decode('utf-8')
        Student.update_face_encoding(student['id'], encoding_str)
        Student.update_image_path(student['id'], student_dir)

    if encodings:
        try:
            train_lbph_model()
        except:
            pass

    return jsonify({'message': f'Captured {len(encodings)} valid face samples', 'samples': len(encodings)})

@app.route('/api/students/<int:student_id>/attendance', methods=['GET'])
@token_required
def get_student_attendance(current_user, student_id):
    records = Attendance.get_by_student(student_id)
    return jsonify({'records': records})

@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    subjects = Subject.get_all()
    return jsonify({'subjects': subjects})

@app.route('/api/subjects', methods=['POST'])
@token_required
def add_subject(current_user):
    data = request.json
    subject_id = Subject.create(data['subject_code'], data['subject_name'])
    return jsonify({'message': 'Subject added', 'subject_id': subject_id}), 201

@app.route('/api/subjects/<int:subject_id>', methods=['DELETE'])
@token_required
def delete_subject(current_user, subject_id):
    Subject.delete(subject_id)
    return jsonify({'message': 'Subject deleted'})

@app.route('/api/timetable', methods=['GET'])
@token_required
def get_timetable(current_user):
    entries = Timetable.get_all()
    return jsonify({'timetable': entries})

@app.route('/api/timetable', methods=['POST'])
@token_required
def add_timetable(current_user):
    data = request.json
    Timetable.create(
        data['day'], data['subject_id'],
        data['start_time'], data['end_time'],
        data['lecture_number'], data.get('class_division', 'General')
    )
    return jsonify({'message': 'Timetable entry added'}), 201

@app.route('/api/timetable/<int:timetable_id>', methods=['DELETE'])
@token_required
def delete_timetable(current_user, timetable_id):
    Timetable.delete_by_id(timetable_id)
    return jsonify({'message': 'Timetable entry deleted'})

@app.route('/api/timetable/current-lecture', methods=['GET'])
@token_required
def get_current_lecture(current_user):
    class_division = request.args.get('class_division')
    lecture = Timetable.get_current_lecture(class_division)
    if lecture:
        return jsonify({'lecture': lecture})
    return jsonify({'lecture': None, 'message': 'No ongoing lecture'})

@app.route('/api/attendance/mark', methods=['POST'])
@token_required
def mark_attendance(current_user):
    data = request.json
    image_data = data.get('image')
    lecture_id = data.get('lecture_id')

    if not image_data:
        return jsonify({'error': 'No image provided'}), 400

    lecture = Timetable.get_by_id(lecture_id) if lecture_id else Timetable.get_current_lecture()
    if not lecture:
        return jsonify({'error': 'No ongoing lecture'}), 400

    try:
        image = base64_to_image(image_data)
    except:
        return jsonify({'error': 'Invalid image data'}), 400

    faces, _ = detect_faces(image)
    if len(faces) == 0:
        return jsonify({'error': 'No face detected'}), 400

    face = faces[0]
    face_img = image[face[1]:face[1]+face[3], face[0]:face[0]+face[2]]

    if mask_detector.detect_mask(face_img):
        return jsonify({
            'error': 'Please remove mask for attendance verification',
            'mask_detected': True
        }), 400

    student_id = None
    confidence = 0

    face_encoding = get_face_encoding(image, face)
    if face_encoding is not None:
        known_encodings, known_ids = load_known_faces()
        if known_encodings:
            results, distances = compare_faces(known_encodings, face_encoding)
            if results is not None and any(results):
                match_idx = np.argmin(distances)
                confidence = float((1 - distances[match_idx]) * 100)
                if results[match_idx] and confidence >= 50:
                    student_id = known_ids[match_idx]

    if student_id is None:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        face_gray = gray[face[1]:face[1]+face[3], face[0]:face[0]+face[2]]
        face_gray = cv2.resize(face_gray, (200, 200))
        label, lbph_confidence = recognize_face_lbph(face_gray)
        if label is not None and lbph_confidence < 80:
            student_id = label
            confidence = max(0, 100 - lbph_confidence)

    if student_id is None:
        return jsonify({'error': 'Face not recognized', 'unknown': True}), 401

    success = Attendance.mark(
        student_id, lecture['subject_id'],
        lecture['lecture_number'], 'present', round(confidence, 2)
    )

    if not success:
        return jsonify({'error': 'Attendance already marked for this lecture', 'duplicate': True}), 409

    student = Student.get_by_id(student_id)
    return jsonify({
        'message': 'Attendance marked successfully',
        'student': student,
        'confidence': round(confidence, 2),
        'subject': lecture['subject_name'],
        'lecture_number': lecture['lecture_number']
    })

@app.route('/api/attendance/today', methods=['GET'])
@token_required
def get_today_attendance(current_user):
    subject_id = request.args.get('subject_id', type=int)
    lecture_number = request.args.get('lecture_number', type=int)
    class_division = request.args.get('class_division')
    records = Attendance.get_today_attendance(subject_id, lecture_number, class_division)
    return jsonify({'records': records})

@app.route('/api/attendance/range', methods=['GET'])
@token_required
def get_attendance_range(current_user):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    records = Attendance.get_by_date_range(start_date, end_date)
    return jsonify({'records': records})

@app.route('/api/attendance/subject/<int:subject_id>', methods=['GET'])
@token_required
def get_subject_attendance(current_user, subject_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    records = Attendance.get_by_subject(subject_id, start_date, end_date)
    return jsonify({'records': records})

@app.route('/api/attendance/mark-absent/<int:student_id>', methods=['POST'])
@token_required
def mark_absent(current_user, student_id):
    data = request.json
    lecture = Timetable.get_current_lecture()
    if not lecture:
        return jsonify({'error': 'No ongoing lecture'}), 400
    success = Attendance.mark(student_id, lecture['subject_id'], lecture['lecture_number'], 'absent')
    if success:
        return jsonify({'message': 'Marked absent'})
    return jsonify({'error': 'Already marked'}), 409

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    stats = Attendance.get_dashboard_stats()
    return jsonify(stats)

@app.route('/api/dashboard/subject-stats', methods=['GET'])
@token_required
def get_subject_stats(current_user):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    stats = Attendance.get_subject_wise_attendance(start_date, end_date)
    return jsonify({'subjects': stats})

@app.route('/api/dashboard/recent-attendance', methods=['GET'])
@token_required
def get_recent_attendance(current_user):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT a.date, a.time, s.name, s.roll_number, sub.subject_name, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        ORDER BY a.id DESC LIMIT 20
    """)
    records = cursor.fetchall()
    cursor.close()
    return jsonify({'records': records})

@app.route('/api/attendance/absent-students', methods=['GET'])
@token_required
def get_absent_students(current_user):
    lecture = Timetable.get_current_lecture()
    if not lecture:
        return jsonify({'students': []})
    students = Attendance.get_absent_students_for_lecture(lecture['subject_id'], lecture['lecture_number'])
    return jsonify({'students': students, 'lecture': lecture})

@app.route('/api/attendance/send-sms', methods=['POST'])
@token_required
def send_sms_notifications(current_user):
    data = request.json
    subject_id = data.get('subject_id')
    lecture_number = data.get('lecture_number')
    lecture = Timetable.get_current_lecture()
    if not lecture:
        return jsonify({'error': 'No lecture found'}), 400

    absent_students = Attendance.get_absent_students_for_lecture(
        subject_id or lecture['subject_id'],
        lecture_number or lecture['lecture_number']
    )

    results = []
    for student in absent_students:
        lecture_time = f"{lecture['start_time']}"
        result = send_absence_alert(
            student['name'], student['parent_contact'],
            lecture['subject_name'], lecture_time
        )
        log_sms(
            student['id'], student['parent_contact'],
            f"Absence alert for {lecture['subject_name']}",
            'sent' if result.get('success') else 'failed',
            datetime.now().date(),
            lecture['subject_id']
        )
        results.append({'student': student['name'], 'status': result})

    return jsonify({'message': 'SMS notifications processed', 'results': results})

@app.route('/api/reports/daily', methods=['GET'])
@token_required
def daily_report(current_user):
    date_str = request.args.get('date')
    date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.now().date()
    filepath = generate_daily_report(date)
    return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))

@app.route('/api/reports/monthly', methods=['GET'])
@token_required
def monthly_report(current_user):
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    filepath = generate_monthly_report(year, month)
    return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))

@app.route('/api/reports/student/<int:student_id>', methods=['GET'])
@token_required
def student_report(current_user, student_id):
    filepath = generate_student_report(student_id)
    return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))

@app.route('/api/reports/subject/<int:subject_id>', methods=['GET'])
@token_required
def subject_report(current_user, subject_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    filepath = generate_subject_report(subject_id, start_date, end_date)
    return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))

@app.route('/api/reports/export-excel', methods=['POST'])
@token_required
def export_excel(current_user):
    data = request.json
    columns = data.get('columns', [])
    rows = data.get('rows', [])
    filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = generate_excel_report(rows, columns, filename)
    if filepath:
        return send_file(filepath, as_attachment=True, download_name=filename)
    return jsonify({'error': 'Excel export requires openpyxl'}), 400

@app.route('/api/reports/export-pdf', methods=['POST'])
@token_required
def export_pdf(current_user):
    data = request.json
    columns = data.get('columns', [])
    rows = data.get('rows', [])
    filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = generate_pdf_report(rows, columns, filename)
    if filepath:
        return send_file(filepath, as_attachment=True, download_name=filename)
    return jsonify({'error': 'PDF export requires fpdf'}), 400

@app.route('/api/sms-logs', methods=['GET'])
@token_required
def get_sms_logs(current_user):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT sl.*, s.name as student_name, sub.subject_name
        FROM sms_logs sl
        JOIN students s ON sl.student_id = s.id
        JOIN subjects sub ON sl.subject_id = sub.id
        ORDER BY sl.sent_at DESC LIMIT 50
    """)
    logs = cursor.fetchall()
    cursor.close()
    return jsonify({'logs': logs})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/attendance/live-feed', methods=['POST'])
@token_required
def live_feed(current_user):
    data = request.json
    image_data = data.get('image')
    if not image_data:
        return jsonify({'error': 'No image'}), 400

    try:
        image = base64_to_image(image_data)
    except:
        return jsonify({'error': 'Invalid image'}), 400

    faces, _ = detect_faces(image)
    results = []

    for face in faces:
        x, y, w, h = face
        face_img = image[y:y+h, x:x+w]

        mask = mask_detector.detect_mask(face_img)

        encoding = get_face_encoding(image, face)
        student_info = None
        confidence = None

        if encoding is not None:
            known_encodings, known_ids = load_known_faces()
            if known_encodings:
                matches, distances = compare_faces(known_encodings, encoding)
                if matches is not None and any(matches):
                    idx = np.argmin(distances)
                    if matches[idx]:
                        student_info = Student.get_by_id(known_ids[idx])
                        confidence = float((1 - distances[idx]) * 100)

        if student_info is None:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            face_gray = gray[y:y+h, x:x+w]
            face_gray = cv2.resize(face_gray, (200, 200))
            label, lbph_confidence = recognize_face_lbph(face_gray)
            if label is not None and lbph_confidence < 80:
                student_info = Student.get_by_id(label)
                confidence = max(0, 100 - lbph_confidence)

        result = {
            'bbox': [int(x), int(y), int(w), int(h)],
            'mask_detected': mask,
            'student': student_info,
            'confidence': round(confidence, 2) if confidence else None
        }
        results.append(result)

    return jsonify({'faces': results, 'count': len(results)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
