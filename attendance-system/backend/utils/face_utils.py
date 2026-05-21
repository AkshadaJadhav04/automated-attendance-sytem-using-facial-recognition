import cv2
import numpy as np
import pickle
import os
import base64
from io import BytesIO
from PIL import Image

HAAR_CASCADE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'haarcascade_frontalface_default.xml')

def get_face_cascade():
    cascade_path = HAAR_CASCADE_PATH
    if not os.path.exists(cascade_path):
        cascade = cv2.CascadeClassifier()
        if not cascade.load(cv2.samples.findFile(cascade_path)):
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            cascade = cv2.CascadeClassifier(cascade_path)
    else:
        cascade = cv2.CascadeClassifier(cascade_path)
    return cascade

def detect_faces(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = get_face_cascade()
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(100, 100)
    )
    return faces, gray

def detect_faces_dnn(image):
    h, w = image.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(image, (300, 300)), 1.0, (300, 300), [104, 117, 123])

    model_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'opencv_face_detector_uint8.pb')
    config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'opencv_face_detector.pbtxt')

    faces = []
    if os.path.exists(model_file) and os.path.exists(config_file):
        net = cv2.dnn.readNetFromTensorflow(model_file, config_file)
        net.setInput(blob)
        detections = net.forward()
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > 0.5:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (x, y, x2, y2) = box.astype("int")
                faces.append((x, y, x2 - x, y2 - y))
    return faces

_lbph_recognizer = None

def _get_lbph_recognizer():
    global _lbph_recognizer
    if _lbph_recognizer is None:
        try:
            _lbph_recognizer = cv2.face.LBPHFaceRecognizer_create()
        except AttributeError:
            _lbph_recognizer = None
    return _lbph_recognizer

def train_lbph_model():
    recognizer = _get_lbph_recognizer()
    if recognizer is None:
        return
    from backend.models import get_db
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, image_path, roll_number FROM students WHERE image_path IS NOT NULL")
    students = cursor.fetchall()
    cursor.close()
    faces = []
    labels = []
    for s in students:
        import glob as _glob
        student_dir = s['image_path']
        if os.path.exists(student_dir):
            for f in _glob.glob(os.path.join(student_dir, '*.jpg')):
                img = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    faces.append(img)
                    labels.append(s['id'])
    if faces:
        recognizer.train(faces, np.array(labels))
        model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'lbph_model.yml')
        recognizer.save(model_path)

def get_face_encoding(image, face_location):
    try:
        import face_recognition
        x, y, w, h = face_location
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb, [(y, x + w, y + h, x)])
        if encodings:
            return encodings[0]
    except ImportError:
        pass
    return None

def compare_faces(known_encodings, face_encoding, tolerance=0.6):
    try:
        import face_recognition
        if known_encodings and len(known_encodings) > 0:
            results = face_recognition.compare_faces(known_encodings, face_encoding, tolerance)
            distances = face_recognition.face_distance(known_encodings, face_encoding)
            return results, distances
    except ImportError:
        pass
    return None, None

def recognize_face_lbph(face_gray):
    recognizer = _get_lbph_recognizer()
    if recognizer is None:
        return None, None
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'lbph_model.yml')
    if os.path.exists(model_path):
        recognizer.read(model_path)
    try:
        label, confidence = recognizer.predict(face_gray)
        if confidence < 80:
            return label, confidence
    except:
        pass
    return None, None

def encode_face_to_base64(face_img):
    _, buffer = cv2.imencode('.jpg', face_img)
    return base64.b64encode(buffer).decode('utf-8')

def base64_to_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_data = base64.b64decode(base64_string)
    img = Image.open(BytesIO(img_data))
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def crop_face(image, face_location, margin=20):
    x, y, w, h = face_location
    x = max(0, x - margin)
    y = max(0, y - margin)
    x2 = min(image.shape[1], x + w + margin)
    y2 = min(image.shape[0], y + h + margin)
    return image[y:y2, x:x2]

def load_known_faces():
    known_encodings = []
    known_ids = []
    from backend.models import get_db
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, face_encoding FROM students WHERE face_encoding IS NOT NULL")
    students = cursor.fetchall()
    cursor.close()
    for student in students:
        if student['face_encoding']:
            try:
                encoding = np.frombuffer(
                    base64.b64decode(student['face_encoding']),
                    dtype=np.float64
                )
                known_encodings.append(encoding)
                known_ids.append(student['id'])
            except:
                pass
    return known_encodings, known_ids
