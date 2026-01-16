# 🎓 Yuksalish Classroom Face Recognition Attendance System - MVP Build Guide

**Project:** Real-time Multiple Student Face Recognition Attendance System  
**Camera:** Hikvision DS-EGD0288-H/FR (8MP, 4× PTZ Speed Dome)  
**Scope:** MVP - Multiple face recognition ONLY  
**Timeline:** 2-3 weeks  
**Team:** 1 Full-stack developer (You)

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Project Structure](#project-structure)
3. [Prerequisites & Setup](#prerequisites--setup)
4. [Phase 1: Camera Configuration](#phase-1-camera-configuration)
5. [Phase 2: Python Face Recognition Service](#phase-2-python-face-recognition-service)
6. [Phase 3: Node.js Backend](#phase-3-nodejs-backend)
7. [Phase 4: Next.js Frontend (Basic)](#phase-4-nextjs-frontend-basic)
8. [Phase 5: Database Setup](#phase-5-database-setup)
9. [Phase 6: Integration & Testing](#phase-6-integration--testing)
10. [Deployment & Configuration](#deployment--configuration)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Hikvision DS-EGD0288-H/FR (Classroom)                      │
│  - 8MP, 4× PTZ Camera                                       │
│  - RTSP Stream: rtsp://admin:pass@192.168.x.x/Streaming/...│
│  - Panoramic + PTZ channels                                 │
└────────────┬────────────────────────────────────────────────┘
             │ RTSP Stream (H.265 Encoded)
             │
┌────────────▼────────────────────────────────────────────────┐
│  Python Face Recognition Service (Flask + OpenCV)          │
│  ┌────────────────────────────────────────────────────────┐│
│  │ • Receive RTSP stream from camera                       ││
│  │ • Real-time face detection (MTCNN/Dlib)               ││
│  │ • Face encoding (face_recognition library)             ││
│  │ • Match against enrolled database                      ││
│  │ • Send recognized students to Node.js backend         ││
│  │ • Python service runs on same server as Node.js        ││
│  └────────────────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────────────────┘
             │ REST API (POST /detect_faces)
             │
┌────────────▼────────────────────────────────────────────────┐
│  Node.js + Express Backend (TypeScript)                     │
│  ┌────────────────────────────────────────────────────────┐│
│  │ • Receive detected faces from Python service           ││
│  │ • Log attendance to PostgreSQL                         ││
│  │ • Session management                                   ││
│  │ • REST APIs for frontend                               ││
│  │ • WebSocket for real-time updates                      ││
│  └────────────────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────────────────┘
             │ WebSocket + REST
             │
┌────────────▼────────────────────────────────────────────────┐
│  Next.js Frontend (React + TypeScript)                      │
│  ┌────────────────────────────────────────────────────────┐│
│  │ • Teacher Dashboard: Start/stop attendance session      ││
│  │ • Live detected students list                          ││
│  │ • Attendance log display                               ││
│  │ • Basic enrollment (upload student photos)             ││
│  └────────────────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────────────────┘
             │ CRUD Operations
             │
         PostgreSQL
         (Students, Sessions, Attendance Log)
```

---

## 📁 Project Structure

```
yuksalish-attendance/
├── backend/                          # Node.js + Express
│   ├── src/
│   │   ├── api/
│   │   │   ├── attendance.ts
│   │   │   ├── sessions.ts
│   │   │   └── students.ts
│   │   ├── services/
│   │   │   ├── pythonService.ts      # Call Python face recognition
│   │   │   └── attendanceService.ts
│   │   ├── models/
│   │   │   ├── Student.ts
│   │   │   ├── Session.ts
│   │   │   └── Attendance.ts
│   │   ├── utils/
│   │   │   └── database.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── python/                           # Python Face Recognition Service
│   ├── main.py
│   ├── camera_stream.py              # RTSP streaming
│   ├── face_detector.py              # Face detection & encoding
│   ├── face_matcher.py               # Face matching logic
│   ├── enrollment.py                 # Enroll new students
│   ├── requirements.txt
│   ├── encodings/                    # Stored face encodings
│   │   └── known_faces.pkl
│   └── models/                       # Pre-trained models
│       └── face_model.dat
│
├── frontend/                         # Next.js + React
│   ├── app/
│   │   ├── page.tsx                  # Home page
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Attendance session
│   │   ├── enrollment/
│   │   │   └── page.tsx              # Student enrollment
│   │   └── layout.tsx
│   ├── components/
│   │   ├── AttendanceCard.tsx
│   │   ├── StudentList.tsx
│   │   └── SessionControls.tsx
│   ├── lib/
│   │   ├── api.ts                    # API calls
│   │   └── websocket.ts              # WebSocket setup
│   ├── .env.local.example
│   ├── package.json
│   └── tsconfig.json
│
└── docs/
    ├── CAMERA_SETUP.md               # Hikvision camera config
    ├── DEPLOYMENT.md
    └── API_DOCS.md
```

---

## ✅ Prerequisites & Setup

### **Required Hardware**
- Hikvision DS-EGD0288-H/FR camera (already installed)
- Server/Laptop for backend (macOS M2, recommended)
- Network connectivity (camera accessible from server)

### **Required Software**
```bash
# Node.js & npm (latest LTS)
node -v  # v18+ required
npm -v

# Python 3.9+
python3 --version

# Git
git --version

# PostgreSQL (local or managed service)
# Homebrew (macOS)
brew --version
```

### **Installation Steps**

#### 1. Install Node.js (macOS)
```bash
# Using Homebrew
brew install node

# Verify
node -v
npm -v
```

#### 2. Install Python & Dependencies
```bash
# Install Python (if not present)
brew install python@3.11

# Create virtual environment
python3 -m venv ~/venv_attendance
source ~/venv_attendance/bin/activate

# Verify
python3 --version
```

#### 3. Install PostgreSQL
```bash
# Using Homebrew
brew install postgresql@15

# Start service
brew services start postgresql@15

# Verify
psql --version
```

#### 4. Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE yuksalish_attendance;

# Create user
CREATE USER attendance_user WITH PASSWORD 'secure_password_123';

# Grant privileges
ALTER ROLE attendance_user SET client_encoding TO 'utf8';
ALTER ROLE attendance_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE attendance_user SET default_transaction_deferrable TO 'off';
ALTER ROLE attendance_user SET default_transaction_read_only TO 'off';
GRANT ALL PRIVILEGES ON DATABASE yuksalish_attendance TO attendance_user;

# Exit
\q
```

#### 5. Clone & Setup Project
```bash
# Create project directory
mkdir -p ~/projects/yuksalish-attendance
cd ~/projects/yuksalish-attendance

# Initialize Git
git init

# Create directory structure
mkdir backend frontend python
```

---

## 🎥 Phase 1: Camera Configuration

### **Hikvision DS-EGD0288-H/FR Specifications**

| Specification | Value |
|---------------|-------|
| **Resolution** | 8MP (3840 × 2160) |
| **Lens** | 2.8mm (panoramic) + 8-32mm (PTZ) |
| **Face Recognition Range** | Up to 20m |
| **Protocol** | RTSP, ONVIF, HTTP, HTTPS |
| **RTSP Port** | 554 (default) |
| **RTSP Format** | `rtsp://username:password@IP:554/Streaming/Channels/XXX/01` |
| **Default Credentials** | admin / 12345 (change immediately) |
| **Network** | PoE+ supported |

### **Step 1: Access Camera Web Interface**

```
1. Note camera IP address: 192.168.x.x (check on device or DHCP)
2. Open browser: http://192.168.x.x
3. Login: admin / 12345
4. Change password immediately to strong password
```

### **Step 2: Configure Network Settings**

```
Camera Web Interface → Network Configuration
├─ Static IP: Set to fixed IP (e.g., 192.168.1.100)
├─ DNS: 8.8.8.8 / 1.1.1.1
├─ Enable RTSP: YES
├─ RTSP Port: 554
└─ HTTP Port: 80
```

### **Step 3: Enable RTSP Stream**

```
Camera Web Interface → Video Management → RTSP
├─ Enable RTSP: Check
├─ Panoramic Channel: Enable (main stream)
└─ PTZ Channel: Enable (sub stream)
```

### **Step 4: Verify RTSP Connectivity**

```bash
# Test RTSP stream with VLC
# Install VLC if needed
brew install vlc

# Open VLC → Media → Open Network Stream
# Paste RTSP URL:
rtsp://admin:your_new_password@192.168.1.100:554/Streaming/Channels/101/01

# You should see live video from classroom
```

### **Step 5: Get RTSP URL for Your Environment**

```bash
# For Panoramic Channel (Full classroom view)
RTSP_URL="rtsp://admin:your_password@192.168.1.100:554/Streaming/Channels/101/01"

# For PTZ Channel (Zoomed, tracking)
RTSP_URL_PTZ="rtsp://admin:your_password@192.168.1.100:554/Streaming/Channels/102/01"

# For Sub-stream (Lower bandwidth, for testing)
RTSP_URL_SUB="rtsp://admin:your_password@192.168.1.100:554/Streaming/Channels/101/02"

# Save these URLs - you'll need them in Python service
```

### **Step 6: Camera Network Test (from your server)**

```bash
# Test connectivity
ping 192.168.1.100

# Test RTSP port
nc -zv 192.168.1.100 554

# Output should be: "Connection to 192.168.1.100 port 554 [tcp/rtsp] succeeded!"
```

---

## 🐍 Phase 2: Python Face Recognition Service

### **Step 1: Install Python Dependencies**

```bash
# Activate virtual environment
source ~/venv_attendance/bin/activate

# Navigate to python directory
cd ~/projects/yuksalish-attendance/python

# Create requirements.txt
cat > requirements.txt << 'EOF'
opencv-python==4.8.1.78
opencv-contrib-python==4.8.1.78
numpy==1.24.3
flask==3.0.0
python-dotenv==1.0.0
face-recognition==1.4.0
dlib==19.24.2
Pillow==10.0.0
requests==2.31.0
scipy==1.11.2
EOF

# Install all dependencies
pip install -r requirements.txt

# Verify installations
python3 -c "import cv2; import face_recognition; print('✅ All packages installed')"
```

### **Step 2: Create Face Detector Module**

Create `python/face_detector.py`:

```python
import cv2
import face_recognition
import numpy as np
from pathlib import Path
import pickle
import os

class FaceDetector:
    def __init__(self, encodings_path="encodings/known_faces.pkl"):
        self.encodings_path = encodings_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.load_encodings()
    
    def load_encodings(self):
        """Load pre-calculated face encodings from file"""
        if os.path.exists(self.encodings_path):
            with open(self.encodings_path, 'rb') as f:
                data = pickle.load(f)
                self.known_face_encodings = data.get("encodings", [])
                self.known_face_names = data.get("names", [])
                self.known_face_ids = data.get("ids", [])
            print(f"✅ Loaded {len(self.known_face_encodings)} face encodings")
        else:
            print("⚠️ No encodings file found. Students must be enrolled first.")
    
    def detect_and_recognize_faces(self, frame, confidence_threshold=0.6):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: OpenCV image frame
            confidence_threshold: Minimum confidence to mark as recognized
        
        Returns:
            List of dicts with student_id, name, confidence, bbox
        """
        # Resize frame for faster processing (H.265 4K → smaller)
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
        
        if not face_locations:
            return []
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        results = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare faces
            matches = face_recognition.compare_faces(
                self.known_face_encodings, 
                face_encoding,
                tolerance=0.6
            )
            face_distances = face_recognition.face_distance(
                self.known_face_encodings, 
                face_encoding
            )
            
            name = "Unknown"
            student_id = None
            confidence = 0
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                confidence = 1 - face_distances[best_match_index]
                
                if matches[best_match_index] and confidence >= confidence_threshold:
                    name = self.known_face_names[best_match_index]
                    student_id = self.known_face_ids[best_match_index]
            
            # Scale back up face coordinates
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            results.append({
                "student_id": student_id,
                "name": name,
                "confidence": float(confidence),
                "bbox": {"top": top, "right": right, "bottom": bottom, "left": left}
            })
        
        return results
    
    def enroll_student(self, image_path, student_id, student_name):
        """
        Enroll a new student by encoding their face
        
        Args:
            image_path: Path to student photo
            student_id: Student ID
            student_name: Student name
        """
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if not face_encodings:
            raise ValueError(f"No face detected in {image_path}")
        
        if len(face_encodings) > 1:
            raise ValueError(f"Multiple faces detected in {image_path}. Use single face image.")
        
        # Add to known faces
        self.known_face_encodings.append(face_encodings[0])
        self.known_face_names.append(student_name)
        self.known_face_ids.append(student_id)
        
        # Save encodings
        os.makedirs(os.path.dirname(self.encodings_path), exist_ok=True)
        with open(self.encodings_path, 'wb') as f:
            pickle.dump({
                "encodings": self.known_face_encodings,
                "names": self.known_face_names,
                "ids": self.known_face_ids
            }, f)
        
        print(f"✅ Enrolled: {student_name} (ID: {student_id})")
    
    def remove_student(self, student_id):
        """Remove a student from face database"""
        indices = [i for i, id_ in enumerate(self.known_face_ids) if id_ == student_id]
        
        for idx in reversed(indices):
            del self.known_face_encodings[idx]
            del self.known_face_names[idx]
            del self.known_face_ids[idx]
        
        # Save updated encodings
        with open(self.encodings_path, 'wb') as f:
            pickle.dump({
                "encodings": self.known_face_encodings,
                "names": self.known_face_names,
                "ids": self.known_face_ids
            }, f)
        
        print(f"✅ Removed student ID: {student_id}")
```

### **Step 3: Create Camera Stream Module**

Create `python/camera_stream.py`:

```python
import cv2
import threading
import time
from queue import Queue
from typing import Optional

class CameraStream:
    def __init__(self, rtsp_url: str, frame_queue_size: int = 1):
        self.rtsp_url = rtsp_url
        self.frame_queue = Queue(maxsize=frame_queue_size)
        self.cap = None
        self.thread = None
        self.running = False
    
    def connect(self):
        """Connect to RTSP stream"""
        print(f"🔗 Connecting to: {self.rtsp_url}")
        self.cap = cv2.VideoCapture(self.rtsp_url)
        
        if not self.cap.isOpened():
            raise ConnectionError("❌ Failed to connect to camera")
        
        # Set video properties for faster processing
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer
        self.cap.set(cv2.CAP_PROP_FPS, 5)  # 5 FPS is enough for attendance
        
        print("✅ Camera connected successfully")
    
    def start_stream(self):
        """Start streaming in background thread"""
        self.running = True
        self.thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.thread.start()
        print("▶️  Stream started")
    
    def _stream_loop(self):
        """Read frames continuously"""
        while self.running:
            ret, frame = self.cap.read()
            
            if not ret:
                print("⚠️ Failed to read frame, reconnecting...")
                self.cap.release()
                time.sleep(2)
                try:
                    self.connect()
                except:
                    continue
            
            # Empty queue if full (drop old frames)
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except:
                    pass
            
            try:
                self.frame_queue.put(frame, timeout=1)
            except:
                pass
    
    def get_frame(self) -> Optional:
        """Get latest frame from queue"""
        try:
            return self.frame_queue.get(timeout=1)
        except:
            return None
    
    def stop_stream(self):
        """Stop streaming"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        if self.cap:
            self.cap.release()
        print("⏹️  Stream stopped")
```

### **Step 4: Create Flask API Service**

Create `python/main.py`:

```python
from flask import Flask, jsonify, request, send_file
from camera_stream import CameraStream
from face_detector import FaceDetector
import os
from dotenv import load_dotenv
import cv2
import time
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# Initialize components
RTSP_URL = os.getenv("CAMERA_RTSP_URL", "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101/01")
camera_stream = None
face_detector = FaceDetector()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "Face Recognition Service"})

@app.route('/start', methods=['POST'])
def start_detection():
    """Start camera stream and detection"""
    global camera_stream
    
    try:
        if camera_stream is None:
            camera_stream = CameraStream(RTSP_URL)
            camera_stream.connect()
        
        camera_stream.start_stream()
        return jsonify({"status": "started", "message": "Camera stream started"}), 200
    except Exception as e:
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
    
    if camera_stream is None:
        return jsonify({"error": "Camera not started"}), 400
    
    frame = camera_stream.get_frame()
    if frame is None:
        return jsonify({"error": "No frame available"}), 400
    
    # Detect and recognize faces
    results = face_detector.detect_and_recognize_faces(frame)
    
    return jsonify({
        "timestamp": datetime.now().isoformat(),
        "students_detected": len(results),
        "results": results
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

if __name__ == '__main__':
    print("🚀 Face Recognition Service Starting...")
    print(f"📹 Camera RTSP URL: {RTSP_URL}")
    print(f"👥 Enrolled students: {len(face_detector.known_face_ids)}")
    app.run(host='0.0.0.0', port=5000, debug=False)
```

### **Step 5: Create .env File**

Create `python/.env`:

```bash
CAMERA_RTSP_URL=rtsp://admin:your_password@192.168.1.100:554/Streaming/Channels/101/01
CONFIDENCE_THRESHOLD=0.6
FRAME_RATE=5
```

### **Step 6: Test Python Service**

```bash
# From python directory
source ~/venv_attendance/bin/activate

# Start service
python3 main.py

# In another terminal, test endpoints
curl http://localhost:5000/health
curl -X POST http://localhost:5000/start
curl http://localhost:5000/detect
curl http://localhost:5000/stop
```

---

## 🚀 Phase 3: Node.js Backend

### **Step 1: Create Node.js Project**

```bash
cd ~/projects/yuksalish-attendance/backend

# Initialize
npm init -y

# Install dependencies
npm install express typescript ts-node @types/node @types/express dotenv cors pg axios ws body-parser

# Install dev dependencies
npm install -D @types/cors @types/pg

# Create TypeScript config
npx tsc --init
```

### **Step 2: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### **Step 3: Create Database Module**

Create `backend/src/utils/database.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'attendance_user',
  password: process.env.DB_PASSWORD || 'secure_password_123',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'yuksalish_attendance'
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

export default pool;
```

### **Step 4: Create Database Models**

Create `backend/src/models/Student.ts`:

```typescript
import pool from '../utils/database';

export interface Student {
  id: string;
  name: string;
  student_id: string;
  class: string;
  face_encoding_id: string;
  created_at: Date;
}

export class StudentModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        class VARCHAR(50),
        face_encoding_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(query);
  }

  static async create(student_id: string, name: string, className: string, face_encoding_id: string) {
    const query = `
      INSERT INTO students (student_id, name, class, face_encoding_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [student_id, name, className, face_encoding_id]);
    return result.rows[0];
  }

  static async getById(id: string) {
    const query = 'SELECT * FROM students WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getByStudentId(student_id: string) {
    const query = 'SELECT * FROM students WHERE student_id = $1';
    const result = await pool.query(query, [student_id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM students ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: string, name: string, className: string) {
    const query = `
      UPDATE students
      SET name = $1, class = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, className, id]);
    return result.rows[0];
  }

  static async delete(id: string) {
    const query = 'DELETE FROM students WHERE id = $1';
    await pool.query(query, [id]);
  }
}
```

Create `backend/src/models/Session.ts`:

```typescript
import pool from '../utils/database';

export interface Session {
  id: string;
  class: string;
  subject: string;
  teacher_id: string;
  started_at: Date;
  ended_at: Date | null;
  status: 'active' | 'ended';
}

export class SessionModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        teacher_id VARCHAR(100),
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(query);
  }

  static async create(className: string, subject: string, teacher_id: string) {
    const query = `
      INSERT INTO sessions (class, subject, teacher_id, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `;
    const result = await pool.query(query, [className, subject, teacher_id]);
    return result.rows[0];
  }

  static async getActiveSession(className: string) {
    const query = `
      SELECT * FROM sessions
      WHERE class = $1 AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [className]);
    return result.rows[0];
  }

  static async endSession(sessionId: string) {
    const query = `
      UPDATE sessions
      SET status = 'ended', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }

  static async getById(id: string) {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}
```

Create `backend/src/models/Attendance.ts`:

```typescript
import pool from '../utils/database';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  confidence: number;
  status: 'present' | 'absent';
  recorded_at: Date;
}

export class AttendanceModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        student_id VARCHAR(50) NOT NULL,
        confidence FLOAT DEFAULT 0.0,
        status VARCHAR(20) DEFAULT 'present',
        recorded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(query);
  }

  static async recordAttendance(
    sessionId: string,
    studentId: string,
    confidence: number
  ) {
    const query = `
      INSERT INTO attendance (session_id, student_id, confidence, status)
      VALUES ($1, $2, $3, 'present')
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [sessionId, studentId, confidence]);
    return result.rows[0];
  }

  static async getSessionAttendance(sessionId: string) {
    const query = `
      SELECT a.*, s.name as student_name
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.student_id
      WHERE a.session_id = $1
      ORDER BY a.recorded_at DESC
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows;
  }

  static async getStudentAttendance(studentId: string, limit: number = 30) {
    const query = `
      SELECT a.*, s.class, sessions.subject
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.student_id
      LEFT JOIN sessions ON a.session_id = sessions.id
      WHERE a.student_id = $1
      ORDER BY a.recorded_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [studentId, limit]);
    return result.rows;
  }
}
```

### **Step 5: Create API Routes**

Create `backend/src/api/attendance.ts`:

```typescript
import express from 'express';
import axios from 'axios';
import { SessionModel } from '../models/Session';
import { AttendanceModel } from '../models/Attendance';
import { StudentModel } from '../models/Student';

const router = express.Router();

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// Start attendance session
router.post('/sessions/start', async (req, res) => {
  try {
    const { className, subject, teacher_id } = req.body;

    if (!className || !teacher_id) {
      return res.status(400).json({ error: 'Missing className or teacher_id' });
    }

    // Create session
    const session = await SessionModel.create(className, subject || '', teacher_id);

    // Start Python face detection
    try {
      await axios.post(`${PYTHON_SERVICE_URL}/start`);
    } catch (err) {
      console.warn('⚠️ Could not start Python service, but continuing...');
    }

    res.json({
      status: 'started',
      session_id: session.id,
      class: session.class,
      started_at: session.started_at
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// End attendance session
router.post('/sessions/:session_id/end', async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await SessionModel.endSession(session_id);

    // Stop Python face detection
    try {
      await axios.post(`${PYTHON_SERVICE_URL}/stop`);
    } catch (err) {
      console.warn('⚠️ Could not stop Python service');
    }

    res.json({
      status: 'ended',
      session_id: session.id,
      ended_at: session.ended_at
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get detected faces from Python service and log attendance
router.post('/detect', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // Get detected faces from Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/detect`);
    const { results } = response.data;

    // Log each detected student
    const logged = [];
    for (const result of results) {
      if (result.student_id) {
        const attendance = await AttendanceModel.recordAttendance(
          session_id,
          result.student_id,
          result.confidence
        );
        if (attendance) {
          logged.push({
            student_id: result.student_id,
            name: result.name,
            confidence: result.confidence
          });
        }
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      session_id,
      students_detected: logged.length,
      students: logged
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get session attendance
router.get('/sessions/:session_id/attendance', async (req, res) => {
  try {
    const { session_id } = req.params;
    const attendance = await AttendanceModel.getSessionAttendance(session_id);
    res.json({ session_id, attendance });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
```

### **Step 6: Create Main Server File**

Create `backend/src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StudentModel } from './models/Student';
import { SessionModel } from './models/Session';
import { AttendanceModel } from './models/Attendance';
import attendanceRouter from './api/attendance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('📊 Initializing database tables...');
    await StudentModel.createTable();
    await SessionModel.createTable();
    await AttendanceModel.createTable();
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}

// Routes
app.use('/api/attendance', attendanceRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Attendance Backend' });
});

// Start server
async function start() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

### **Step 7: Create .env File**

Create `backend/.env`:

```bash
# Database
DB_USER=attendance_user
DB_PASSWORD=secure_password_123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuksalish_attendance

# Python Service
PYTHON_SERVICE_URL=http://localhost:5000

# Server
PORT=3001
NODE_ENV=development
```

### **Step 8: Update package.json**

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "watch": "tsc --watch"
  }
}
```

### **Step 9: Test Backend**

```bash
cd ~/projects/yuksalish-attendance/backend

# Install if first time
npm install

# Run in development
npm run dev

# In another terminal, test:
curl http://localhost:3001/health
```

---

## 📱 Phase 4: Next.js Frontend (Basic)

### **Step 1: Create Next.js Project**

```bash
cd ~/projects/yuksalish-attendance/frontend

# Create Next.js with TypeScript
npx create-next-app@latest . --typescript --tailwind

# Install additional packages
npm install axios zustand

# Install types
npm install -D @types/node @types/react
```

### **Step 2: Create API Client**

Create `frontend/lib/api.ts`:

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

export const attendanceAPI = {
  // Start session
  startSession: async (className: string, subject: string, teacher_id: string) => {
    const res = await api.post('/attendance/sessions/start', {
      className,
      subject,
      teacher_id
    });
    return res.data;
  },

  // End session
  endSession: async (session_id: string) => {
    const res = await api.post(`/attendance/sessions/${session_id}/end`);
    return res.data;
  },

  // Detect faces
  detectFaces: async (session_id: string) => {
    const res = await api.post('/attendance/detect', { session_id });
    return res.data;
  },

  // Get session attendance
  getSessionAttendance: async (session_id: string) => {
    const res = await api.get(`/attendance/sessions/${session_id}/attendance`);
    return res.data;
  }
};

export default api;
```

### **Step 3: Create Dashboard Component**

Create `frontend/app/dashboard/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { attendanceAPI } from '@/lib/api';

interface AttendanceRecord {
  student_id: string;
  name: string;
  confidence: number;
  recorded_at: string;
}

interface Session {
  id: string;
  class: string;
  subject: string;
  status: string;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [className, setClassName] = useState('10-A');
  const [subject, setSubject] = useState('Mathematics');
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Start session
  const handleStartSession = async () => {
    try {
      setLoading(true);
      const result = await attendanceAPI.startSession(className, subject, 'teacher-001');
      setSession(result);
      setAttendance([]);
      setIsDetecting(true);
      
      // Auto-detect every 2 seconds
      const interval = setInterval(async () => {
        await detectFaces(result.session_id);
      }, 2000);
      
      // Store interval ID
      (window as any).detectionInterval = interval;
    } catch (err) {
      console.error('Error starting session:', err);
      alert('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Detect faces
  const detectFaces = async (sessionId: string) => {
    try {
      const result = await attendanceAPI.detectFaces(sessionId);
      
      if (result.students && result.students.length > 0) {
        // Add new students to list
        setAttendance(prev => {
          const ids = new Set(prev.map(a => a.student_id));
          const newStudents = result.students.filter(
            (s: AttendanceRecord) => !ids.has(s.student_id)
          );
          return [...prev, ...newStudents];
        });
      }
    } catch (err) {
      console.error('Error detecting faces:', err);
    }
  };

  // End session
  const handleEndSession = async () => {
    if (!session) return;

    try {
      setLoading(true);
      
      // Clear auto-detection
      if ((window as any).detectionInterval) {
        clearInterval((window as any).detectionInterval);
      }
      
      await attendanceAPI.endSession(session.id);
      setSession(null);
      setIsDetecting(false);
    } catch (err) {
      console.error('Error ending session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          📚 Classroom Attendance System
        </h1>

        {!session ? (
          // Start Session Form
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Start Attendance Session</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., 10-A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {loading ? 'Starting...' : '▶️ Start Session'}
            </button>
          </div>
        ) : (
          // Active Session
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Active Session: {session.class}
                </h2>
                <p className="text-gray-600">Subject: {session.subject}</p>
              </div>
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                {loading ? 'Ending...' : '⏹️ End Session'}
              </button>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-700">
                🎥 Camera is live - detecting student faces in real-time
              </p>
            </div>
          </div>
        )}

        {/* Attendance List */}
        {attendance.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              ✅ Attendance ({attendance.length} students)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left font-bold text-gray-700">#</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Student ID</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Confidence</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono">{record.student_id}</td>
                      <td className="px-4 py-2">{record.name}</td>
                      <td className="px-4 py-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          {(record.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(record.recorded_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### **Step 4: Create Home Page**

Create `frontend/app/page.tsx`:

```typescript
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          🎓 Yuksalish Attendance
        </h1>
        <p className="text-xl text-blue-100 mb-8">
          Real-time Classroom Face Recognition System
        </p>

        <Link href="/dashboard">
          <button className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition text-lg">
            📊 Go to Dashboard →
          </button>
        </Link>

        <div className="mt-12 text-white text-left inline-block">
          <h2 className="text-2xl font-bold mb-4">Features:</h2>
          <ul className="space-y-2 text-lg">
            <li>✅ Real-time face detection and recognition</li>
            <li>✅ Automatic attendance logging</li>
            <li>✅ Multiple students simultaneously</li>
            <li>✅ Confidence score tracking</li>
            <li>✅ Session management</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### **Step 5: Create .env.local**

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### **Step 6: Test Frontend**

```bash
cd ~/projects/yuksalish-attendance/frontend

npm run dev

# Visit http://localhost:3000
```

---

## 💾 Phase 5: Database Setup

### **Step 1: Create Tables Automatically**

```bash
# Backend will create tables automatically on startup
cd ~/projects/yuksalish-attendance/backend
npm run dev

# You should see: "✅ Database tables initialized"
```

### **Step 2: Manual Database Verification**

```bash
psql -U attendance_user -d yuksalish_attendance

# Check tables
\dt

# Should show:
# attendance | table | attendance_user
# sessions   | table | attendance_user
# students   | table | attendance_user

# Check schema
\d students
\d sessions
\d attendance

# Exit
\q
```

---

## 🧪 Phase 6: Integration & Testing

### **Step 1: Start All Services**

Open 4 terminal windows:

**Terminal 1: Python Face Recognition Service**
```bash
cd ~/projects/yuksalish-attendance/python
source ~/venv_attendance/bin/activate
python3 main.py

# Expected output:
# 🚀 Face Recognition Service Starting...
# 📹 Camera RTSP URL: rtsp://admin:password@192.168.x.x:554/...
# 👥 Enrolled students: 0
```

**Terminal 2: Node.js Backend**
```bash
cd ~/projects/yuksalish-attendance/backend
npm run dev

# Expected output:
# 📊 Initializing database tables...
# ✅ Database tables initialized
# 🚀 Server running on http://localhost:3001
```

**Terminal 3: Next.js Frontend**
```bash
cd ~/projects/yuksalish-attendance/frontend
npm run dev

# Expected output:
# - Local:        http://localhost:3000
```

**Terminal 4: Test curl commands**
```bash
# Test Python service health
curl http://localhost:5000/health

# Output: {"status":"ok","service":"Face Recognition Service"}

# Test Node.js health
curl http://localhost:3001/health

# Output: {"status":"ok","service":"Attendance Backend"}
```

### **Step 2: Enroll Test Students**

Before running the system, you need to enroll student faces:

```bash
# Upload a student photo
curl -X POST http://localhost:5000/enroll \
  -F "photo=@/path/to/student_photo.jpg" \
  -F "student_id=STU001" \
  -F "student_name=Raj Patel"

# Response:
# {"status":"enrolled","student_id":"STU001","student_name":"Raj Patel"}

# Repeat for each student
```

Or create `python/enroll_students.py`:

```python
from face_detector import FaceDetector
import os

detector = FaceDetector()

# Sample enrollment (replace with actual photos)
students = [
    {"id": "STU001", "name": "Raj Patel", "photo": "photos/raj.jpg"},
    {"id": "STU002", "name": "Priya Singh", "photo": "photos/priya.jpg"},
    {"id": "STU003", "name": "Amit Kumar", "photo": "photos/amit.jpg"},
]

for student in students:
    try:
        if os.path.exists(student["photo"]):
            detector.enroll_student(student["photo"], student["id"], student["name"])
        else:
            print(f"⚠️ Photo not found: {student['photo']}")
    except Exception as e:
        print(f"❌ Error enrolling {student['name']}: {e}")

print(f"\n✅ Total enrolled: {len(detector.known_face_ids)}")
```

Run:
```bash
python3 python/enroll_students.py
```

### **Step 3: Test Full Workflow**

1. **Open frontend:** http://localhost:3000/dashboard

2. **Start session:**
   - Enter Class: "10-A"
   - Enter Subject: "Mathematics"
   - Click "Start Session"

3. **Camera activation:**
   - Face Recognition Service automatically starts detecting
   - Real-time face matching happens

4. **View attendance:**
   - Students detected appear in the table
   - Confidence scores shown
   - Timestamps recorded

5. **End session:**
   - Click "End Session"
   - Attendance is finalized in database

### **Step 4: Verify Database**

```bash
psql -U attendance_user -d yuksalish_attendance

# Check recorded attendance
SELECT * FROM attendance LIMIT 5;

# Check sessions
SELECT * FROM sessions;

# Check students
SELECT * FROM students;
```

---

## 🚀 Deployment & Configuration

### **Production Checklist**

- [ ] Change all default passwords
- [ ] Set environment variables for production
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up automated backups for PostgreSQL
- [ ] Configure logging and monitoring
- [ ] Test with multiple students
- [ ] Optimize camera RTSP stream quality
- [ ] Set up error handling and alerting

### **Environment Configuration**

Create production `.env` files:

**backend/.env.production**
```bash
DB_USER=attendance_user
DB_PASSWORD=secure_random_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuksalish_attendance
PYTHON_SERVICE_URL=http://localhost:5000
PORT=3001
NODE_ENV=production
```

**python/.env.production**
```bash
CAMERA_RTSP_URL=rtsp://admin:secure_password@192.168.1.100:554/Streaming/Channels/101/01
CONFIDENCE_THRESHOLD=0.65
FRAME_RATE=3
FLASK_ENV=production
```

### **Start Services (Production)**

Create `start.sh`:

```bash
#!/bin/bash

# Start PostgreSQL
brew services start postgresql@15

# Start Python service
cd ~/projects/yuksalish-attendance/python
source ~/venv_attendance/bin/activate
nohup python3 main.py > logs/python.log 2>&1 &

# Start Node.js backend
cd ~/projects/yuksalish-attendance/backend
npm run build
nohup npm start > logs/backend.log 2>&1 &

# Start Next.js frontend
cd ~/projects/yuksalish-attendance/frontend
npm run build
nohup npm start > logs/frontend.log 2>&1 &

echo "✅ All services started"
```

Make executable:
```bash
chmod +x ~/projects/yuksalish-attendance/start.sh
```

Run:
```bash
~/projects/yuksalish-attendance/start.sh
```

---

## 📊 Summary

**MVP Scope: Multiple Face Recognition Only**

| Component | Status | Time |
|-----------|--------|------|
| Camera Config | ✅ | 1-2 hours |
| Python Service | ✅ | 2-3 hours |
| Node.js Backend | ✅ | 3-4 hours |
| Frontend | ✅ | 2-3 hours |
| Database | ✅ | 1-2 hours |
| Integration Testing | ✅ | 2-3 hours |
| **TOTAL** | ✅ | **2-3 weeks** |

**What's NOT included in MVP:**
- ❌ Advanced enrollment UI
- ❌ Reports generation
- ❌ Admin dashboard
- ❌ Multi-classroom management
- ❌ Historical attendance analytics

**Next Phases (after MVP):**
1. Enrollment UI with photo upload
2. Attendance reports and exports
3. Admin dashboard
4. Mobile app
5. Email notifications

---

**Start with Phase 1 (Camera) and work sequentially. Each phase builds on the previous one.**

Good luck! 🚀
