import os
from datetime import datetime

TWILIO_ENABLED = False

try:
    from twilio.rest import Client
    TWILIO_ENABLED = True
except ImportError:
    pass

def send_sms(parent_contact, message):
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
    from_number = os.environ.get('TWILIO_PHONE_NUMBER', '')

    if not all([account_sid, auth_token, from_number]):
        return {'success': False, 'error': 'Twilio credentials not configured'}

    try:
        client = Client(account_sid, auth_token)
        sms = client.messages.create(
            body=message,
            from_=from_number,
            to=parent_contact
        )
        return {'success': True, 'sid': sms.sid}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def send_absence_alert(student_name, parent_contact, subject_name, lecture_time):
    message = (
        f"Dear Parent, your child {student_name} was absent "
        f"for today's {subject_name} lecture at {lecture_time}. "
        f"Please ensure regular attendance. - Attendance System"
    )
    return send_sms(parent_contact, message)

def send_presence_alert(student_name, parent_contact, subject_name, lecture_time):
    message = (
        f"Dear Parent, your child {student_name} was present "
        f"for today's {subject_name} lecture at {lecture_time}. - Attendance System"
    )
    return send_sms(parent_contact, message)

def log_sms(student_id, parent_contact, message, status, lecture_date, subject_id):
    from backend.models import get_db
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO sms_logs (student_id, parent_contact, message, status, lecture_date, subject_id) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (student_id, parent_contact, message, status, lecture_date, subject_id)
    )
    db.commit()
    cursor.close()
