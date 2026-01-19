from flask import Flask, jsonify, request, send_file, Response
from camera_stream_ffmpeg import CameraStreamFFmpeg
from face_detector import FaceDetector
import os
from dotenv import load_dotenv
import cv2
import numpy as np
import time
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# Initialize components
# Use double @@ for password with @ symbol in Hikvision cameras
RTSP_URL = os.getenv("CAMERA_RTSP_URL", "rtsp://admin:1qaz2wsx@@192.168.34.196:554/Streaming/Channels/101")
camera_stream = None
face_detector = FaceDetector()

# Flag to indicate if we're using a real camera or simulation mode
# FFmpeg-based streaming is more stable than OpenCV VideoCapture
USE_SIMULATION = os.getenv("USE_SIMULATION", "false").lower() == "true"

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "Face Recognition Service"})

@app.route('/start', methods=['POST'])
def start_detection():
    """Start camera stream and detection"""
    global camera_stream
    
    try:
        if USE_SIMULATION:
            # Simulation mode - no real camera
            return jsonify({
                "status": "started", 
                "message": "Camera stream started (simulation mode)",
                "mode": "simulation"
            }), 200
        
        if camera_stream is None:
            camera_stream = CameraStreamFFmpeg(RTSP_URL)
            try:
                camera_stream.connect()
            except Exception as conn_err:
                print(f"⚠️ Camera connection failed: {conn_err}")
                camera_stream = None
                # Continue in simulation mode
                return jsonify({
                    "status": "started",
                    "message": f"Running in simulation mode (camera unavailable: {str(conn_err)})",
                    "mode": "simulation"
                }), 200
        
        camera_stream.start_stream()
        return jsonify({"status": "started", "message": "Camera stream started", "mode": "live"}), 200
    except Exception as e:
        print(f"❌ Error starting detection: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/stop', methods=['POST'])
def stop_detection():
    """Stop camera stream"""
    global camera_stream
    
    if camera_stream:
        camera_stream.stop_stream()
    
    return jsonify({"status": "stopped", "message": "Camera stream stopped"}), 200

@app.route('/detect', methods=['POST'])
def detect_faces():
    """
    Detect faces in current frame
    Returns list of recognized students
    """
    global camera_stream
    
    # If in simulation mode or camera not working, return empty results
    if USE_SIMULATION or camera_stream is None:
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "students_detected": 0,
            "results": [],
            "mode": "simulation"
        }), 200
    
    try:
        frame = camera_stream.get_frame()
        if frame is None:
            return jsonify({
                "timestamp": datetime.now().isoformat(),
                "students_detected": 0,
                "results": [],
                "message": "No frame available"
            }), 200
        
        # Detect and recognize faces
        results = face_detector.detect_and_recognize_faces(frame)
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "students_detected": len(results),
            "results": results,
            "mode": "live"
        }), 200
    except Exception as e:
        print(f"⚠️ Detection error: {e}")
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "students_detected": 0,
            "results": [],
            "error": str(e)
        }), 200

@app.route('/enroll', methods=['POST'])
def enroll_student():
    """Enroll new student by uploading photo"""
    
    if 'photo' not in request.files:
        return jsonify({"error": "No photo provided"}), 400
    
    student_id = request.form.get('student_id')
    student_name = request.form.get('student_name')
    
    if not student_id or not student_name:
        return jsonify({"error": "Missing student_id or student_name"}), 400
    
    file = request.files['photo']
    
    try:
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, f"{student_id}.jpg")
        file.save(filepath)
        
        # Enroll student
        face_detector.enroll_student(filepath, student_id, student_name)
        
        return jsonify({
            "status": "enrolled",
            "student_id": student_id,
            "student_name": student_name
        }), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get statistics about enrolled students"""
    return jsonify({
        "total_enrolled": len(face_detector.known_face_ids),
        "students": [
            {
                "id": sid,
                "name": sname
            }
            for sid, sname in zip(face_detector.known_face_ids, face_detector.known_face_names)
        ]
    }), 200

@app.route('/video_feed')
def video_feed():
    """Video streaming route for camera feed with face detection overlay"""
    def generate():
        while True:
            try:
                if USE_SIMULATION or camera_stream is None:
                    # Generate a placeholder frame in simulation mode
                    frame = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(frame, 'Simulation Mode', (150, 200), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                    cv2.putText(frame, 'Camera feed unavailable', (130, 250), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
                    cv2.putText(frame, f'{len(face_detector.known_face_ids)} students enrolled', (150, 300), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 200, 100), 1)
                else:
                    frame = camera_stream.get_frame()
                    if frame is None:
                        # No frame available - show waiting message
                        frame = np.zeros((480, 640, 3), dtype=np.uint8)
                        cv2.putText(frame, 'Connecting to camera...', (120, 200), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                        cv2.putText(frame, 'Please wait...', (200, 250), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
                    else:
                        # Make a writable copy of the frame for drawing
                        frame = frame.copy()
                        
                        # Detect faces and draw overlays
                        results = face_detector.detect_and_recognize_faces(frame)
                        
                        # Draw bounding boxes and labels on frame
                        for result in results:
                            bbox = result['bbox']
                            name = result['name']
                            confidence = result['confidence']
                            
                            # Draw rectangle around face
                            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)  # Green for known, Red for unknown
                            cv2.rectangle(frame, 
                                        (bbox['left'], bbox['top']), 
                                        (bbox['right'], bbox['bottom']), 
                                        color, 2)
                            
                            # Prepare label with name and confidence
                            if name != "Unknown":
                                label = f"{name} ({confidence*100:.1f}%)"
                            else:
                                label = "Unknown"
                            
                            # Draw label background
                            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                            cv2.rectangle(frame,
                                        (bbox['left'], bbox['top'] - 30),
                                        (bbox['left'] + label_size[0] + 10, bbox['top']),
                                        color, -1)
                            
                            # Draw label text
                            cv2.putText(frame, label,
                                      (bbox['left'] + 5, bbox['top'] - 10),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                        
                        # Resize for web display
                        frame = cv2.resize(frame, (960, 540))
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                    
                frame_bytes = buffer.tobytes()
                
                # Yield frame in multipart format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                time.sleep(0.2)  # 5 FPS (reduced from 10 FPS for performance)
                
            except GeneratorExit:
                # Client disconnected
                break
            except Exception as e:
                print(f"⚠️ Video feed error: {e}")
                time.sleep(1)
                continue
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    print("🚀 Face Recognition Service Starting...")
    print(f"📹 Camera RTSP URL: {RTSP_URL}")
    print(f"👥 Enrolled students: {len(face_detector.known_face_ids)}")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
