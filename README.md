# 🎓 Yuksalish Classroom Face Recognition Attendance System

Real-time multiple student face recognition attendance system using Hikvision camera.

## 📋 System Components

1. **Python Face Recognition Service** (Port 5000)
   - Real-time face detection from RTSP camera stream
   - Face encoding and matching
   - Student enrollment

2. **Node.js Backend** (Port 3001)
   - Express + TypeScript server
   - PostgreSQL database
   - Session and attendance management

3. **Next.js Frontend** (Port 3000)
   - React + TypeScript dashboard
   - Real-time attendance display
   - Session controls

## 🚀 Quick Start

### Prerequisites

```bash
# Install Node.js (v18+)
brew install node

# Install Python 3.9+
brew install python@3.11

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15
```

### 1. Setup Database

```bash
# Create database
psql postgres -c "CREATE DATABASE yuksalish_attendance;"
psql postgres -c "CREATE USER attendance_user WITH PASSWORD 'secure_password_123';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE yuksalish_attendance TO attendance_user;"
```

### 2. Setup Python Service

```bash
cd python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set camera credentials (edit main.py or create .env)
# RTSP URL: rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/101

# Test camera connection
python test_camera.py

# Start service
python main.py
# Server will run on http://localhost:5000
```

### 3. Setup Node.js Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_USER=attendance_user
DB_PASSWORD=secure_password_123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuksalish_attendance
PYTHON_SERVICE_URL=http://localhost:5000
PORT=3001
NODE_ENV=development
EOF

# Start backend
npm run dev
# Server will run on http://localhost:3001
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies (already done)
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF

# Start frontend
npm run dev
# Frontend will run on http://localhost:3000
```

## 📸 Camera Configuration

**Camera:** Hikvision DS-EGD0288-H/FR  
**IP:** 192.168.34.196  
**Credentials:**
- Username: admin
- Password: 1qaz2wsx@

**RTSP URLs:**
- Panoramic Channel: `rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/101`
- PTZ Channel: `rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/102`

Note: The @ symbol is URL-encoded as %40

## 👥 Enrolling Students

Before using the system, you need to enroll student faces:

### Method 1: Via API
```bash
curl -X POST http://localhost:5000/enroll \
  -F "photo=@/path/to/student_photo.jpg" \
  -F "student_id=STU001" \
  -F "student_name=John Doe"
```

### Method 2: Via Python Script
Create `python/enroll_students.py`:

```python
from face_detector import FaceDetector
import os

detector = FaceDetector()

students = [
    {"id": "STU001", "name": "John Doe", "photo": "photos/john.jpg"},
    {"id": "STU002", "name": "Jane Smith", "photo": "photos/jane.jpg"},
]

for student in students:
    if os.path.exists(student["photo"]):
        detector.enroll_student(student["photo"], student["id"], student["name"])
```

Run:
```bash
cd python
python enroll_students.py
```

## 🔧 Usage

1. **Start all services** (in separate terminals):
   ```bash
   # Terminal 1: Python service
   cd python && source venv/bin/activate && python main.py
   
   # Terminal 2: Node.js backend
   cd backend && npm run dev
   
   # Terminal 3: Next.js frontend
   cd frontend && npm run dev
   ```

2. **Access the dashboard**: http://localhost:3000

3. **Start attendance session**:
   - Enter class name (e.g., "10-A")
   - Enter subject (e.g., "Mathematics")
   - Click "Start Session"

4. **Automatic detection**:
   - Camera starts detecting faces
   - Students are automatically recognized and logged
   - Attendance appears in real-time on dashboard

5. **End session**:
   - Click "End Session" to finalize attendance

## 📊 API Endpoints

### Python Service (Port 5000)
- `GET /health` - Health check
- `POST /start` - Start camera stream
- `POST /stop` - Stop camera stream
- `POST /detect` - Detect faces in current frame
- `POST /enroll` - Enroll new student
- `GET /stats` - Get enrolled students

### Node.js Backend (Port 3001)
- `GET /health` - Health check
- `POST /api/attendance/sessions/start` - Start attendance session
- `POST /api/attendance/sessions/:id/end` - End session
- `POST /api/attendance/detect` - Detect and log attendance
- `GET /api/attendance/sessions/:id/attendance` - Get session attendance

## 🗄️ Database Schema

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  class VARCHAR(50),
  face_encoding_id VARCHAR(100),
  created_at TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  class VARCHAR(50),
  subject VARCHAR(255),
  teacher_id VARCHAR(100),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20)
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  student_id VARCHAR(50),
  confidence FLOAT,
  status VARCHAR(20),
  recorded_at TIMESTAMP,
  UNIQUE(session_id, student_id)
);
```

## 🐛 Troubleshooting

### Camera Connection Issues
```bash
# Test camera connectivity
ping 192.168.34.196

# Test RTSP port
nc -zv 192.168.34.196 554

# Test with VLC
vlc rtsp://admin:1qaz2wsx@192.168.34.196:554/Streaming/Channels/101
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Test connection
psql -U attendance_user -d yuksalish_attendance -h localhost
```

### Python Dependencies Issues
```bash
# On macOS with M1/M2, you might need:
brew install cmake
pip install --upgrade pip
pip install -r requirements.txt
```

## 📝 Notes

- The system is designed for MVP with multiple face recognition only
- Confidence threshold is set to 0.6 (60%)
- Face detection runs at 5 FPS to balance performance
- Each student can only be marked present once per session
- The camera has two channels - use panoramic for full classroom view

## 🚀 Next Steps

After MVP is working:
1. Add enrollment UI to frontend
2. Implement attendance reports
3. Add admin dashboard
4. Create mobile app
5. Add email notifications

## 📞 Support

For issues or questions, check the troubleshooting section or review the detailed guide in `Classroom-Attendance-MVP.md`.
# new-recognition
