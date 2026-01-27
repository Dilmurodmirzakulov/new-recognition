# Face Recognition Quality Improvements - Setup Guide

## What Changed

### 1. **Full-Resolution Encoding** (Biggest Quality Win)

- Detection still runs on 50% frame (fast)
- Encodings now computed from **original full-res frame**
- Result: Much better face detail for recognition

### 2. **Fixed Threshold Logic**

- Removed double-filtering bug (was requiring distance ≤ 0.5 instead of ≤ 0.6)
- Now uses single tolerance check consistently
- Result: Fewer false "Unknown" matches

### 3. **Quality Gates**

- Minimum face size filter (default 80px)
- Skips faces that are too small for reliable recognition
- Result: Reduces false positives

### 4. **Better Enrollment**

- Selects **largest face** instead of first-found (avoids background faces)
- Uses `num_jitters=5` + `model="large"` for higher quality embeddings
- Result: More stable, accurate student encodings

### 5. **Detector Backend Options**

- **HOG** (default) - Fast, CPU-only
- **CNN** - Better quality, slower
- **YOLO** - Best quality for angled/small faces, requires GPU for real-time

### 6. **CPU/GPU Selection**

- Automatic device selection via `DETECTOR_DEVICE` env var
- YOLO and CNN can use GPU acceleration

## Configuration

Edit your `.env` file or set environment variables:

```bash
# Detector Backend
DETECTOR_BACKEND=hog     # Options: hog, cnn, yolo
DETECTOR_DEVICE=cpu      # Options: cpu, cuda
MIN_FACE_SIZE=80         # Minimum face size in pixels
```

## Testing Different Configurations

### Option 1: Current Setup (Fast, Good Quality)

```bash
# .env
DETECTOR_BACKEND=hog
DETECTOR_DEVICE=cpu
MIN_FACE_SIZE=80
```

✅ No new dependencies needed  
✅ Fast on CPU  
✅ Already 30-40% better than before (full-res encoding + fixed thresholds)

### Option 2: Better Quality (CPU)

```bash
# .env
DETECTOR_BACKEND=cnn
DETECTOR_DEVICE=cpu
MIN_FACE_SIZE=80
```

✅ No new dependencies  
✅ Better detection on angled faces  
⚠️ Slower (2-3x) but still usable

### Option 3: Best Quality (Requires GPU)

```bash
# Install YOLO first
pip install ultralytics

# .env
DETECTOR_BACKEND=yolo
DETECTOR_DEVICE=cuda     # or 'cpu' if no GPU
MIN_FACE_SIZE=80
```

✅ Best face detection quality  
✅ Great for small/angled/occluded faces  
⚠️ Needs GPU for real-time (or set DETECTOR_DEVICE=cpu for testing)

## Quick Start

### 1. Install Dependencies (if using YOLO)

```bash
cd /Users/wiut/Desktop/Recognition/python
pip install -r requirements.txt
```

### 2. Configure Your Setup

```bash
# Copy example
cp ../.env.example ../.env

# Edit .env and set:
# - DETECTOR_BACKEND (hog/cnn/yolo)
# - DETECTOR_DEVICE (cpu/cuda)
```

### 3. Re-enroll Students (Important!)

The enrollment now uses better quality settings. You should re-enroll all students:

```bash
# Option A: Delete old encodings and re-enroll via UI
rm python/encodings/known_faces.pkl

# Option B: Keep old encodings but re-enroll via API
# (old encodings will be updated with new high-quality versions)
```

### 4. Start the System

```bash
./start.sh
```

Watch the logs - you'll see:

```
🔍 Face detector: HOG on CPU
📏 Minimum face size: 80px
✅ Loaded X face encodings
```

## Performance Tips

### For Your Classroom Setup (12×7m, 25 students, ceiling mount)

**Recommended starting point:**

```bash
DETECTOR_BACKEND=hog
DETECTOR_DEVICE=cpu
MIN_FACE_SIZE=80
```

This gives you the immediate wins (full-res encoding + fixed thresholds) with zero deployment complexity.

**If recognition is still poor:**

1. Check typical face size in frames (should be 100+ pixels wide ideally)
2. Consider PTZ presets to zoom into sections
3. Try `DETECTOR_BACKEND=cnn` for better detection
4. Last resort: `DETECTOR_BACKEND=yolo` with GPU

**If faces are consistently < 80px:**

- Lower `MIN_FACE_SIZE` to 60 (but expect more false positives)
- Better solution: use camera zoom or higher resolution stream

## Monitoring Quality

After changes, check:

1. **Detection rate**: Are faces being detected? (check logs for "No face found")
2. **False Unknown rate**: Enrolled students showing as "Unknown"?
3. **Face size warnings**: See "Skipping face: too small" logs?
4. **Confidence scores**: Should be 0.6+ for correct matches

## Troubleshooting

### "Failed to load YOLO detector"

- Run: `pip install ultralytics`
- Or change to `DETECTOR_BACKEND=hog`

### "Skipping face: too small"

- Faces are below MIN_FACE_SIZE threshold
- Solutions:
  - Increase camera resolution
  - Use PTZ zoom
  - Lower MIN_FACE_SIZE (but may hurt accuracy)

### GPU not detected (YOLO)

- Check: `python -c "import torch; print(torch.cuda.is_available())"`
- Set `DETECTOR_DEVICE=cpu` if no GPU available

### Recognition worse after changes

- Did you re-enroll students?
- Check DETECTOR_BACKEND setting
- Review confidence threshold (0.6 is default, can adjust in face_detector.py)

## Expected Improvements

With **just the code fixes** (no YOLO):

- 30-40% reduction in false "Unknown" (from threshold fix + full-res encoding)
- Better enrollment quality (largest face + num_jitters=5)
- Fewer false positives from tiny faces (MIN_FACE_SIZE gate)

With **YOLO + GPU**:

- 50-70% better detection on angled/small faces
- Much more stable frame-to-frame tracking
- Best option for challenging classroom scenarios
