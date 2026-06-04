import cv2
import base64
import numpy as np
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

app = Flask(__name__)
CORS(app)

# ─── NEW: DYNAMIC CONFIGURATION FOR SYSTEM RUNTIME ROBUSTNESS ───
# Finds the exact folder this focus_tracker.py file is sitting in (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Builds the absolute fallback path directly to the model resource
model_path = os.path.join(BASE_DIR, 'models', 'face_landmarker.task')
# ────────────────────────────────────────────────────────────────

# --- INITIALIZE MEDIAPIPE TASKS (Modern API) ---
base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    output_face_blendshapes=True,
    output_facial_transformation_matrixes=True,
    num_faces=1
)
detector = vision.FaceLandmarker.create_from_options(options)

def analyze_frame(image):
    # Convert OpenCV BGR to MediaPipe RGB Image
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    
    # Run detection
    detection_result = detector.detect(mp_image)
    
    if not detection_result.face_landmarks:
        return "Absent"

    # Head Pose Heuristic (Checking if user is looking away)
    # The transformation matrix provides the rotation data
    if detection_result.facial_transformation_matrixes:
        matrix = detection_result.facial_transformation_matrixes[0]
        # Check the rotation values (index [0,2] and [1,2] relate to Yaw and Pitch)
        yaw = abs(matrix[0, 2])
        pitch = matrix[1, 2]

        if yaw > 0.25: # Looking too far left or right
            return "Distracted"
        if pitch < -0.15 or pitch > 0.15: # Looking too far up or down
            return "Distracted"

    return "Focused"

@app.route('/api/focus/process-frame', methods=['POST'])
def process_frame():
    data = request.json
    try:
        header, encoded = data['image'].split(',', 1)
        image_data = base64.b64decode(encoded)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        state = analyze_frame(img)
        return jsonify({"status": "success", "state": state}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)