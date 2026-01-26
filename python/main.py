from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from camera_stream_ffmpeg import CameraStreamFFmpeg
from face_detector import FaceDetector
import os
from dotenv import load_dotenv
import cv2
import numpy as np
import time
from datetime import datetime
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Camera configuration
RTSP_URL = os.getenv("CAMERA_RTSP_URL", "rtsp://admin:1qaz2wsx@@192.168.34.196:554/Streaming/Channels/101")
SRS_COOKIE = os.getenv("SRS_COOKIE", "UserLoginCookie25=CfDJ8KVxKgiAMW1FmYphz-ha4c1HzugeMxI8L9l_yxaWd1cJHbeC16fyW7V0Sj0v3V7MenwGGPtGzKieNDm3qhfzWn6NHMPkKeglUTspIJZ_yf47PIptQcL2ZFZmDSxocghzdS21PcWlSDx6ut4yD9L9qSMJ2pEWqU5USo2TOKNhonIBTSCu0HlupLFFKKqS5muxg7bxVYyNw8eH4sQulRkfMPttMIa7PKgT6oDc_JQ4abKXLL4mBYenL0oC7ki-sdGcmhYw8gToOQrhqRJ9Yf9nKwt4H5PHoSJ78C0mI-1ZSgOB")

camera_stream = None
face_detector = FaceDetector()

USE_SIMULATION = os.getenv("USE_SIMULATION", "false").lower() == "true"


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "Face Recognition Service"})


@app.route('/start', methods=['POST'])
def start_camera():
    """Start camera stream"""
    global camera_stream
    
    try:
        if USE_SIMULATION:
            return jsonify({"status": "started", "mode": "simulation"}), 200
        
        if camera_stream is not None:
            try:
                camera_stream.stop_stream()
            except:
                pass
            camera_stream = None
        
        camera_stream = CameraStreamFFmpeg(RTSP_URL)
        camera_stream.connect()
        camera_stream.start_stream()
        return jsonify({"status": "started", "mode": "live"}), 200
        
    except Exception as e:
        print(f"⚠️ Camera error: {e}")
        return jsonify({"status": "started", "mode": "simulation", "error": str(e)}), 200


@app.route('/stop', methods=['POST'])
def stop_camera():
    """Stop camera stream"""
    global camera_stream
    
    if camera_stream:
        camera_stream.stop_stream()
        camera_stream = None
    
    return jsonify({"status": "stopped"}), 200


@app.route('/check-students', methods=['POST'])
def check_students():
    """Check which students from the list present have embeddings"""
    data = request.json
    print(f"📥 Check students request: {data}")
    
    student_ids = data.get('student_ids', [])
    print(f"📋 Checking {len(student_ids)} student IDs against {len(face_detector.known_face_ids)} known faces")
    print(f"📋 Known IDs: {face_detector.known_face_ids}")
    
    missing_ids = []
    present_ids = []
    
    for sid in student_ids:
        # Convert to string for comparison as ids in file are likely strings
        sid_str = str(sid)
        if sid_str in face_detector.known_face_ids:
            present_ids.append(sid_str)
        else:
            missing_ids.append(sid_str)
    
    print(f"✅ Present: {len(present_ids)}, ❌ Missing: {len(missing_ids)}")
            
    return jsonify({
        "missing": missing_ids,
        "present": present_ids
    }), 200


@app.route('/embed-students', methods=['POST'])
def embed_students():
    """Download and embed images for students"""
    import gc  # Garbage collector for memory management
    
    data = request.json
    print(f"📥 Received embed request with {len(data.get('students', [])) if isinstance(data, dict) else 'unknown'} students")
    
    # Accept both 'students' array or direct array
    students = data.get('students', []) if isinstance(data, dict) else []
    if not students and isinstance(data, list):
        students = data
    
    print(f"📋 Processing {len(students)} students")
    
    success = []
    failed = []
    
    headers = {
        "Cookie": SRS_COOKIE,
        "User-Agent": "Mozilla/5.0"
    }
    
    for i, student in enumerate(students):
        sid = student.get('studentId') or student.get('id')
        if sid is None:
            continue
        sid = str(sid)
        name = student.get('fullName') or student.get('name') or sid
            
        print(f"[{i+1}/{len(students)}] Processing student {sid}...")
        
        # 1. Download Image
        image_url = f"https://srs.wiut.uz/logo/{sid}.jpg"
        try:
            response = requests.get(image_url, headers=headers, timeout=15)
            print(f"  Download response: {response.status_code}, size: {len(response.content)} bytes")
            
            if response.status_code == 200 and len(response.content) > 1000:
                # 2. Convert to numpy array
                image_array = np.asarray(bytearray(response.content), dtype=np.uint8)
                img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
                
                if img is None:
                    print(f"  Failed to decode image for {sid}")
                    failed.append({"id": sid, "reason": "Image decode failed"})
                    # Clean up
                    del image_array
                    gc.collect()
                    continue
                
                print(f"  Image shape: {img.shape}")
                
                # 3. Add Encoding
                try:
                    if face_detector.add_student_encoding(sid, name, img):
                        success.append(sid)
                        print(f"  ✅ Successfully encoded {sid}")
                    else:
                        failed.append({"id": sid, "reason": "No face found"})
                        print(f"  ⚠️ No face found for {sid}")
                except Exception as enc_error:
                    print(f"  ❌ Encoding error for {sid}: {enc_error}")
                    failed.append({"id": sid, "reason": f"Encoding error: {str(enc_error)}"})
                
                # Clean up memory after each student
                del img
                del image_array
                gc.collect()
            else:
                reason = f"Download failed: status={response.status_code}, size={len(response.content)}"
                print(f"  {reason}")
                failed.append({"id": sid, "reason": reason})
                
        except Exception as e:
            print(f"  Error processing {sid}: {e}")
            failed.append({"id": sid, "reason": str(e)})
        
        # Force garbage collection every 5 students
        if (i + 1) % 5 == 0:
            gc.collect()
            
    # Save after batch processing
    if success:
        face_detector.save_encodings()
    
    print(f"📊 Results: {len(success)} success, {len(failed)} failed")
    
    return jsonify({
        "success": success,
        "failed": failed
    }), 200



@app.route('/detect', methods=['POST'])
def detect_faces():
    """Detect and recognize faces in current frame"""
    global camera_stream
    
    if USE_SIMULATION or camera_stream is None:
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "results": [],
            "mode": "simulation"
        }), 200
    
    try:
        frame = camera_stream.get_frame()
        if frame is None:
            return jsonify({
                "timestamp": datetime.now().isoformat(),
                "results": [],
                "message": "No frame available"
            }), 200
        
        results = face_detector.detect_and_recognize_faces(frame)
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "results": results,
            "mode": "live"
        }), 200
        
    except Exception as e:
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "results": [],
            "error": str(e)
        }), 200


@app.route('/get_encoding', methods=['POST'])
def get_encoding():
    """
    Get face encoding from uploaded image
    Used to save embedding to external API
    """
    if 'photo' not in request.files:
        return jsonify({"error": "No photo provided"}), 400
    
    file = request.files['photo']
    
    try:
        # Save temporarily
        temp_path = "/tmp/temp_face.jpg"
        file.save(temp_path)
        
        # Get encoding
        encoding = face_detector.get_face_encoding(temp_path)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if encoding is None:
            return jsonify({"error": "No face detected in image"}), 400
        
        return jsonify({
            "encoding": encoding,
            "embedding_method": "face_recognition_dlib"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/compare', methods=['POST'])
def compare_faces():
    """
    Compare two face encodings
    """
    data = request.get_json()
    
    if not data or 'encoding1' not in data or 'encoding2' not in data:
        return jsonify({"error": "Missing encoding1 or encoding2"}), 400
    
    try:
        result = face_detector.compare_encoding(
            data['encoding1'],
            data['encoding2'],
            data.get('tolerance', 0.6)
        )
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/video_feed')
def video_feed():
    """Video streaming with face detection overlay"""
    frame_count = 0
    last_results = []
    
    def generate():
        nonlocal frame_count, last_results
        while True:
            try:
                if USE_SIMULATION or camera_stream is None:
                    frame = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(frame, 'Camera Unavailable', (180, 240), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                else:
                    frame = camera_stream.get_frame()
                    if frame is None:
                        frame = np.zeros((480, 640, 3), dtype=np.uint8)
                        cv2.putText(frame, 'Connecting...', (220, 240), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                    else:
                        frame = frame.copy()
                        
                        # Only detect faces every 5 frames to reduce CPU load
                        frame_count += 1
                        if frame_count % 5 == 0:
                            try:
                                last_results = face_detector.detect_and_recognize_faces(frame)
                            except Exception as e:
                                print(f"Face detection error: {e}")
                                last_results = []
                        
                        # Draw cached results on every frame
                        for result in last_results:
                            bbox = result['bbox']
                            name = result['name']
                            confidence = result['confidence']
                            
                            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                            cv2.rectangle(frame, 
                                        (bbox['left'], bbox['top']), 
                                        (bbox['right'], bbox['bottom']), 
                                        color, 2)
                            
                            label = f"{name} ({confidence*100:.0f}%)" if name != "Unknown" else "Unknown"
                            cv2.putText(frame, label,
                                      (bbox['left'], bbox['top'] - 10),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                        
                        frame = cv2.resize(frame, (960, 540))
                
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                
                time.sleep(0.1)
                
            except GeneratorExit:
                print("Video feed closed by client")
                break
            except Exception as e:
                print(f"Video feed error: {e}")
                time.sleep(1)
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    print("🚀 Face Recognition Service")
    print(f"📹 Camera: {RTSP_URL[:50]}...")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
