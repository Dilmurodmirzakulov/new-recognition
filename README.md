# WIUT Attendance System

Face recognition-based attendance tracking system for WIUT.

## Architecture

```
Frontend (Next.js:3000) ─→ External API (newattendanceapi.wiut.uz)
                        └→ Python Service (Flask:5000) ─→ Camera (RTSP)
```

## Quick Start

```bash
./start.sh   # Start services
./stop.sh    # Stop services
```

## Project Structure

```
├── frontend/          # Next.js web application
│   ├── app/           # App router pages
│   └── lib/           # API utilities
├── python/            # Face recognition service
│   ├── main.py        # Flask API server
│   ├── face_detector.py    # Face detection & encoding
│   └── camera_stream_ffmpeg.py  # RTSP camera streaming
└── projectplan.md     # API documentation
```

## External API

All data is managed through: `https://newattendanceapi.wiut.uz/api`

### Endpoints Used:

- `POST /Auth/Login` - Authentication
- `POST /Auth/Refresh` - Token refresh
- `POST /Attendance/MyModulesStaff` - Get teacher modules
- `POST /Attendance/LessonsByParams` - Get lessons/slots
- `POST /Attendance/StudentsByLesson` - Get students list
- `POST /Attendance/SetEmbedding` - Save face encoding
- `POST /Attendance/SetAttendanceStudent` - Record attendance

## Python Service (Port 5000)

Local face recognition service:

- `GET /health` - Health check
- `POST /start` - Start camera
- `POST /stop` - Stop camera
- `POST /detect` - Detect faces
- `POST /get_encoding` - Get face encoding from image
- `POST /compare` - Compare two encodings
- `GET /video_feed` - Live video stream

## Requirements

- Node.js 18+
- Python 3.9+
- FFmpeg
