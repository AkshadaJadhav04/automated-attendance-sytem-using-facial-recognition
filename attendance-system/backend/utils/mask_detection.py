import cv2
import numpy as np
import os

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models')

class MaskDetector:
    def __init__(self):
        self.net = None
        self.load_model()

    def load_model(self):
        model_file = os.path.join(MODEL_PATH, 'mask_detector.model')
        config_file = os.path.join(MODEL_PATH, 'deploy.prototxt')

        if os.path.exists(model_file) and os.path.exists(config_file):
            self.net = cv2.dnn.readNet(model_file, config_file)
        else:
            self.net = None

    def detect_mask(self, face_image):
        if self.net is None:
            return self._simple_mask_detection(face_image)

        try:
            blob = cv2.dnn.blobFromImage(face_image, 1.0, (100, 100), (104.0, 177.0, 123.0))
            self.net.setInput(blob)
            detections = self.net.forward()
            return detections[0][0] > detections[0][1]
        except:
            return self._simple_mask_detection(face_image)

    def _simple_mask_detection(self, face_image):
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        face_region = gray[h//4:3*h//4, w//4:3*w//4]
        if face_region.size == 0:
            return False

        mean_brightness = np.mean(face_region)
        std_brightness = np.std(face_region)

        edges = cv2.Canny(face_region, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        upper_face = gray[h//4:h//2, w//4:3*w//4]
        lower_face = gray[h//2:3*h//4, w//4:3*w//4]

        upper_mean = np.mean(upper_face) if upper_face.size > 0 else 0
        lower_mean = np.mean(lower_face) if lower_face.size > 0 else 0
        contrast_diff = abs(upper_mean - lower_mean)

        if edge_density < 0.01 and contrast_diff < 5 and std_brightness < 30:
            return True

        return False

    def detect_mask_region(self, face_image):
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        nose_region = gray[3*h//8:5*h//8, 3*w//8:5*w//8]
        if nose_region.size == 0:
            return False

        edges = cv2.Canny(nose_region, 30, 100)
        edge_count = np.sum(edges > 0)

        if edge_count < 20:
            return True

        return False

mask_detector = MaskDetector()
