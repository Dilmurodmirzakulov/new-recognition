# 📚 Classroom Attendance System - Complete Workflow & Library Explanation

## 🏗️ System Architecture Overview

The system consists of **3 main services** working together:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend       │      │   Backend       │      │   Python Service │
│   (Next.js)      │◄────►│   (Node.js)     │◄────►│   (Flask)        │
│   Port 3000      │      │   Port 3001     │      │   Port 5000      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │   Camera      │
                                                    │   (RTSP)      │
                                                    └──────────────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │  PostgreSQL   │
                                                    │   Database    │
                                                    └──────────────┘
```

---

## 🔄 Complete Workflow: From Camera to Database

### **Step 1: User Starts Session (Frontend → Backend)**

**Location:** `frontend/app/dashboard/page.tsx`

1. User fills form (Class, Subject) and clicks "Start Session"
2. Frontend calls `attendanceAPI.startSession()`
3. **Library Used:** `axios` - HTTP client for API calls

```typescript
// frontend/lib/api.ts
const res = await api.post('/attendance/sessions/start', {
  className, subject, teacher_id
});
```

---

### **Step 2: Backend Creates Session & Starts Camera (Backend → Python)**

**Location:** `backend/src/api/attendance.ts`

1. Backend receives request via **Express.js** router
2. Creates session in PostgreSQL using **pg** library
3. Sends HTTP request to Python service to start camera
4. **Libraries Used:**
   - `express` - Web framework for REST API
   - `axios` - HTTP client to communicate with Python service
   - `pg` - PostgreSQL database driver

```typescript
// Create session in database
const session = await SessionModel.create(className, subject, teacher_id);

// Start Python face detection service
await axios.post(`${PYTHON_SERVICE_URL}/start`);
```

---

### **Step 3: Python Service Connects to Camera (Python → Camera)**

**Location:** `python/main.py` → `python/camera_stream_ffmpeg.py`

1. Python service receives `/start` request via **Flask**
2. Creates `CameraStreamFFmpeg` instance
3. Uses **FFmpeg** (via `subprocess`) to connect to RTSP camera stream
4. **Libraries Used:**
   - `flask` - Web framework for Python REST API
   - `subprocess` - Python built-in to run FFmpeg command
   - `threading` - Run camera stream in background thread
   - `queue` - Thread-safe queue for frames

```python
# python/camera_stream_ffmpeg.py
command = [
    'ffmpeg',
    '-rtsp_transport', 'tcp',  # Use TCP for stability
    '-i', self.rtsp_url,        # RTSP URL from camera
    '-f', 'image2pipe',
    '-pix_fmt', 'bgr24',        # BGR format for OpenCV
    '-vcodec', 'rawvideo',
    '-s', '1920x1080',          # Resolution
    '-r', '5',                  # 5 FPS
    '-'
]
self.process = subprocess.Popen(command, stdout=subprocess.PIPE)
```

**Why FFmpeg instead of OpenCV VideoCapture?**
- More stable with RTSP streams
- Better error handling
- Works reliably on macOS/Linux

---

### **Step 4: Camera Stream Processing (Continuous Loop)**

**Location:** `python/camera_stream_ffmpeg.py`

1. FFmpeg reads raw video frames from RTSP stream
2. Frames are converted to NumPy arrays
3. Frames stored in thread-safe queue
4. **Libraries Used:**
   - `numpy` - Convert raw bytes to image arrays
   - `queue.Queue` - Thread-safe frame buffer

```python
def _stream_loop(self):
    frame_size = self.width * self.height * 3  # BGR = 3 bytes/pixel
    while self.running:
        raw_frame = self.process.stdout.read(frame_size)
        frame = np.frombuffer(raw_frame, dtype=np.uint8)
        frame = frame.reshape((self.height, self.width, 3))
        self.frame_queue.put(frame)  # Store for processing
```

---

### **Step 5: Frontend Requests Face Detection (Every 2 seconds)**

**Location:** `frontend/app/dashboard/page.tsx`

1. After session starts, frontend sets up interval (every 2 seconds)
2. Calls `attendanceAPI.detectFaces(session_id)`
3. **Library Used:**
   - `setInterval` - JavaScript timer for periodic detection

```typescript
const interval = setInterval(async () => {
  await detectFaces(result.session_id);
}, 2000);
```

---

### **Step 6: Backend Requests Detection from Python (Backend → Python)**

**Location:** `backend/src/api/attendance.ts`

1. Backend receives `/detect` request
2. Forwards request to Python service: `POST http://localhost:5000/detect`
3. **Library Used:**
   - `axios` - HTTP client

```typescript
const response = await axios.post(`${PYTHON_SERVICE_URL}/detect`);
const { results } = response.data;  // Array of detected faces
```

---

### **Step 7: Python Service Detects & Recognizes Faces**

**Location:** `python/main.py` → `python/face_detector.py`

1. Python service gets latest frame from queue
2. Processes frame through face recognition pipeline
3. **Libraries Used:**
   - `opencv-python` (cv2) - Image processing, resizing, color conversion
   - `face_recognition` - Face detection and encoding
   - `numpy` - Array operations

#### **7a. Frame Preprocessing**

```python
# Resize frame for faster processing (75% of original)
small_frame = cv2.resize(frame, (0, 0), fx=0.75, fy=0.75)

# Convert BGR (OpenCV) to RGB (face_recognition expects RGB)
rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
```

**Why resize?**
- Faster processing (smaller image = less computation)
- Still maintains quality for 4-meter detection

#### **7b. Face Detection (HOG Model)**

```python
# Detect face locations using HOG (Histogram of Oriented Gradients)
face_locations = face_recognition.face_locations(
    rgb_small_frame, 
    model="hog",                    # HOG is faster than CNN
    number_of_times_to_upsample=3   # Upsample 3x for distant faces
)
```

**How HOG works:**
- Analyzes gradients (edges) in image
- Creates histogram of gradient orientations
- Matches patterns to detect faces
- `number_of_times_to_upsample=3` means it scales up the image 3x before detection (better for distant faces)

#### **7c. Face Encoding (128-dimensional vector)**

```python
# Generate 128-dimensional encoding for each detected face
face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
```

**How face encoding works:**
- Uses deep learning model (dlib's ResNet)
- Converts face image to 128 numbers
- These numbers represent facial features (distance between eyes, nose shape, etc.)
- Same person = similar encoding (even with different lighting/angle)

#### **7d. Face Matching**

```python
# Compare detected face with enrolled faces
matches = face_recognition.compare_faces(
    self.known_face_encodings,  # Pre-computed encodings from enrollment
    face_encoding,              # Encoding of detected face
    tolerance=0.6                # How similar they need to be (0.6 = 60% match)
)

# Calculate distance (lower = more similar)
face_distances = face_recognition.face_distance(
    self.known_face_encodings, 
    face_encoding
)

# Find best match
best_match_index = np.argmin(face_distances)
confidence = 1 - face_distances[best_match_index]  # Convert distance to confidence
```

**How matching works:**
- Compares 128-dimensional vectors using Euclidean distance
- `tolerance=0.6` means faces must be within 0.6 distance to match
- Lower distance = more similar faces
- Confidence = 1 - distance (higher confidence = better match)

#### **7e. Return Results**

```python
results = [{
    "student_id": "STU001",
    "name": "Student 1",
    "confidence": 0.85,  # 85% confidence
    "bbox": {"top": 100, "right": 200, "bottom": 300, "left": 50}
}]
```

---

### **Step 8: Backend Logs Attendance to Database**

**Location:** `backend/src/api/attendance.ts` → `backend/src/models/Attendance.ts`

1. Backend receives detection results from Python
2. For each recognized student, logs to PostgreSQL
3. Uses `ON CONFLICT DO NOTHING` to prevent duplicates
4. **Libraries Used:**
   - `pg` (node-postgres) - PostgreSQL client

```typescript
// Log each detected student
for (const result of results) {
  if (result.student_id) {
    const attendance = await AttendanceModel.recordAttendance(
      session_id,
      result.student_id,
      result.confidence
    );
  }
}
```

**Database Query:**
```sql
INSERT INTO attendance (session_id, student_id, confidence, status)
VALUES ($1, $2, $3, 'present')
ON CONFLICT (session_id, student_id) DO NOTHING
RETURNING *
```

**Why `ON CONFLICT DO NOTHING`?**
- Prevents duplicate attendance records
- If same student detected multiple times, only first detection is saved

---

### **Step 9: Frontend Displays Results**

**Location:** `frontend/app/dashboard/page.tsx`

1. Frontend receives attendance data from backend
2. Updates React state with new attendance records
3. Displays in table with student info, confidence, time
4. **Libraries Used:**
   - `react` - UI framework
   - `next.js` - React framework with SSR
   - `useState`, `useEffect` - React hooks for state management

```typescript
setAttendance(prev => {
  const ids = new Set(prev.map(a => a.student_id));
  const newStudents = result.students.filter(
    (s: AttendanceRecord) => !ids.has(s.student_id)
  );
  return [...prev, ...newStudents];
});
```

---

### **Step 10: Live Video Feed Display**

**Location:** `python/main.py` → `frontend/app/dashboard/page.tsx`

1. Python service provides `/video_feed` endpoint
2. Streams frames as MJPEG (Motion JPEG) multipart stream
3. Frontend displays using `<img>` tag
4. **Libraries Used:**
   - `flask.Response` - Streaming response
   - `cv2.imencode` - Encode frames as JPEG

```python
# Python: Stream frames
def generate():
    while True:
        frame = camera_stream.get_frame()
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.1)  # 10 FPS

return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
```

```typescript
// Frontend: Display stream
<img src="http://localhost:5000/video_feed" alt="Live Camera Feed" />
```

**How MJPEG streaming works:**
- Each frame is sent as separate JPEG image
- Browser automatically refreshes image when new frame arrives
- `multipart/x-mixed-replace` tells browser to replace previous image

---

## 📚 Library Details & Their Roles

### **Python Service Libraries**

#### **1. Flask** (`flask`)
- **Purpose:** Web framework for REST API
- **Role:** Receives HTTP requests, returns JSON responses
- **Endpoints:**
  - `POST /start` - Start camera stream
  - `POST /stop` - Stop camera stream
  - `POST /detect` - Detect faces in current frame
  - `GET /video_feed` - Stream camera feed
  - `POST /enroll` - Enroll new student
  - `GET /stats` - Get enrolled students

#### **2. OpenCV** (`opencv-python`, `cv2`)
- **Purpose:** Computer vision and image processing
- **Role:**
  - Resize frames for faster processing
  - Convert color spaces (BGR ↔ RGB)
  - Encode frames as JPEG for streaming
  - Draw text/boxes on frames (for debugging)

#### **3. face_recognition** (`face_recognition`)
- **Purpose:** Face detection and recognition
- **Role:**
  - Detects faces in images (HOG model)
  - Generates 128-dimensional face encodings
  - Compares faces to find matches
- **Models Used:**
  - HOG (Histogram of Oriented Gradients) - Fast face detection
  - dlib's ResNet - Face encoding (128D vectors)

#### **4. dlib** (`dlib`)
- **Purpose:** Machine learning library (dependency of face_recognition)
- **Role:** Provides deep learning models for face encoding
- **Model:** ResNet-based face recognition model

#### **5. NumPy** (`numpy`)
- **Purpose:** Numerical computing
- **Role:**
  - Convert raw bytes to image arrays
  - Array operations (reshaping, indexing)
  - Mathematical operations (argmin, distance calculations)

#### **6. FFmpeg** (system binary, not Python package)
- **Purpose:** Video/audio processing
- **Role:** Connects to RTSP camera stream, outputs raw frames
- **Why used:** More stable than OpenCV's VideoCapture for RTSP

#### **7. pickle** (Python built-in)
- **Purpose:** Serialization
- **Role:** Save/load face encodings to/from disk
- **File:** `python/encodings/known_faces.pkl`

#### **8. subprocess** (Python built-in)
- **Purpose:** Run external processes
- **Role:** Execute FFmpeg command to read RTSP stream

#### **9. threading** (Python built-in)
- **Purpose:** Concurrent execution
- **Role:** Run camera stream in background thread (non-blocking)

#### **10. queue** (Python built-in)
- **Purpose:** Thread-safe data structures
- **Role:** Buffer frames between camera thread and detection thread

---

### **Backend (Node.js) Libraries**

#### **1. Express** (`express`)
- **Purpose:** Web framework for REST API
- **Role:** Handle HTTP requests, routing, middleware
- **Endpoints:**
  - `POST /api/attendance/sessions/start` - Start session
  - `POST /api/attendance/sessions/:id/end` - End session
  - `POST /api/attendance/detect` - Detect faces
  - `GET /api/attendance/sessions/:id/attendance` - Get attendance

#### **2. Axios** (`axios`)
- **Purpose:** HTTP client
- **Role:** Communicate with Python service
- **Usage:**
  ```typescript
  await axios.post('http://localhost:5000/start');
  await axios.post('http://localhost:5000/detect');
  ```

#### **3. pg** (`pg`, `node-postgres`)
- **Purpose:** PostgreSQL database client
- **Role:** Execute SQL queries, manage connections
- **Usage:**
  ```typescript
  await pool.query('INSERT INTO sessions ...');
  ```

#### **4. TypeScript** (`typescript`)
- **Purpose:** Typed JavaScript
- **Role:** Type safety, better IDE support

#### **5. dotenv** (`dotenv`)
- **Purpose:** Environment variable management
- **Role:** Load `.env` file for configuration

---

### **Frontend Libraries**

#### **1. Next.js** (`next`)
- **Purpose:** React framework with SSR
- **Role:** 
  - Server-side rendering
  - Routing
  - API routes (if needed)

#### **2. React** (`react`)
- **Purpose:** UI library
- **Role:** Build interactive user interface
- **Hooks Used:**
  - `useState` - Manage component state
  - `useEffect` - Side effects (API calls, intervals)

#### **3. Axios** (`axios`)
- **Purpose:** HTTP client
- **Role:** Make API calls to backend
- **Usage:**
  ```typescript
  const res = await api.post('/attendance/sessions/start', {...});
  ```

#### **4. TypeScript** (`typescript`)
- **Purpose:** Typed JavaScript
- **Role:** Type safety for React components

---

## 🔍 Key Algorithms & Concepts

### **1. Face Detection (HOG)**
- **Algorithm:** Histogram of Oriented Gradients
- **How it works:**
  1. Divides image into cells
  2. Calculates gradient (edge direction) in each cell
  3. Creates histogram of gradient orientations
  4. Matches patterns to detect faces
- **Why HOG:** Fast, works well for frontal faces

### **2. Face Encoding (Deep Learning)**
- **Algorithm:** Deep Convolutional Neural Network (ResNet)
- **How it works:**
  1. Face image → CNN layers
  2. Extracts facial features
  3. Outputs 128-dimensional vector
  4. Similar faces → similar vectors
- **Why 128D:** Balance between accuracy and speed

### **3. Face Matching (Euclidean Distance)**
- **Algorithm:** Distance calculation between vectors
- **Formula:** `distance = sqrt(sum((encoding1 - encoding2)²))`
- **How it works:**
  1. Calculate distance between detected face and all enrolled faces
  2. Find minimum distance (best match)
  3. If distance < tolerance → match found
- **Confidence:** `confidence = 1 - distance`

### **4. RTSP Streaming**
- **Protocol:** Real-Time Streaming Protocol
- **How it works:**
  1. Camera sends video over network
  2. FFmpeg connects to RTSP URL
  3. Receives H.264/H.265 encoded video
  4. Decodes to raw frames
  5. Converts to BGR format for OpenCV

---

## 🎯 Data Flow Summary

```
1. Camera (RTSP) 
   ↓ FFmpeg subprocess
2. Raw frames (NumPy arrays)
   ↓ Queue
3. Face detection (face_recognition)
   ↓ HOG + ResNet
4. Face encodings (128D vectors)
   ↓ Matching
5. Student IDs + confidence
   ↓ HTTP POST
6. Backend API (Express)
   ↓ PostgreSQL
7. Attendance records
   ↓ HTTP GET
8. Frontend (React)
   ↓ UI update
9. Display in table
```

---

## 🛠️ Configuration & Settings

### **Face Recognition Parameters**

```python
# face_detector.py
confidence_threshold = 0.5      # 50% minimum confidence
tolerance = 0.6                 # 60% similarity required
upsampling = 3                  # 3x upsampling for distant faces
processing_resolution = 0.75    # 75% of original size
```

### **Camera Settings**

```python
# camera_stream_ffmpeg.py
width = 1920
height = 1080
fps = 5                         # 5 frames per second
rtsp_transport = 'tcp'          # TCP for stability
```

### **Detection Interval**

```typescript
// frontend/app/dashboard/page.tsx
setInterval(() => {
  detectFaces(session_id);
}, 2000);  // Every 2 seconds
```

---

## 🔐 Security Considerations

1. **RTSP Authentication:** Camera password in RTSP URL
2. **Database:** Uses parameterized queries (prevents SQL injection)
3. **CORS:** Backend allows cross-origin requests (configured for development)
4. **No Authentication:** System currently has no user authentication (MVP)

---

## 📊 Performance Optimizations

1. **Frame Resizing:** Process at 75% resolution (faster, still accurate)
2. **Frame Queue:** Limited size (drops old frames, keeps latest)
3. **Detection Interval:** 2 seconds (not every frame)
4. **HOG Model:** Faster than CNN for detection
5. **Upsampling:** Only when needed (distant faces)
6. **Database:** `ON CONFLICT DO NOTHING` (prevents duplicate queries)

---

## 🐛 Error Handling

1. **Camera Connection:** Falls back to simulation mode
2. **Frame Errors:** Catches exceptions, continues streaming
3. **Detection Errors:** Returns empty results, doesn't crash
4. **Database Errors:** Returns error JSON, logs to console
5. **Network Errors:** Axios catches errors, shows user-friendly messages

---

This workflow ensures reliable, real-time face recognition and attendance tracking! 🎉
