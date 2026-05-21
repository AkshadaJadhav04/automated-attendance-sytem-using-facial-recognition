import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'attendance-system-secret-key-2024')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'attendance_system')
    MYSQL_CURSORCLASS = 'DictCursor'

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-2024')
    JWT_ACCESS_TOKEN_EXPIRES = 3600

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dataset')
    ATTENDANCE_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'attendance')
    REPORTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'reports')
    MODELS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models')

    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    HAAR_CASCADE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models', 'haarcascade_frontalface_default.xml')
