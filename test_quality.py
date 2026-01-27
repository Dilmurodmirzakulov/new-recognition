#!/usr/bin/env python3
"""
Test script to verify face recognition quality improvements
Run this after the system is started to see the improvements in action
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test if service is running"""
    print("🔍 Testing service health...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✅ Service is healthy")
        return True
    else:
        print("❌ Service is not responding")
        return False

def get_encoding_stats():
    """Get current encoding statistics"""
    print("\n📊 Current enrollment statistics...")
    # This would need to be exposed via API or check the pickle file
    import pickle
    import os
    
    encodings_path = "python/encodings/known_faces.pkl"
    if os.path.exists(encodings_path):
        with open(encodings_path, 'rb') as f:
            data = pickle.load(f)
            num_encodings = len(data.get("encodings", []))
            num_ids = len(data.get("ids", []))
            print(f"✅ Total enrolled: {num_ids} students ({num_encodings} encodings)")
            return num_ids
    else:
        print("⚠️ No encodings file found")
        return 0

def test_detection():
    """Test face detection endpoint"""
    print("\n🎥 Testing face detection...")
    response = requests.post(f"{BASE_URL}/detect")
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', [])
        print(f"✅ Detection working - found {len(results)} face(s)")
        for i, result in enumerate(results):
            print(f"  Face {i+1}: {result.get('name', 'Unknown')} (confidence: {result.get('confidence', 0):.2%})")
        return True
    else:
        print("❌ Detection test failed")
        return False

def show_config():
    """Show current detector configuration"""
    print("\n⚙️  Current Configuration:")
    print("  (Check logs/python.log for detector settings)")
    import subprocess
    result = subprocess.run(
        ["grep", "-E", "Face detector|Minimum face size", "logs/python.log"],
        capture_output=True,
        text=True
    )
    if result.stdout:
        for line in result.stdout.strip().split('\n')[-2:]:
            print(f"  {line}")

def main():
    print("=" * 60)
    print("🚀 Face Recognition Quality Test")
    print("=" * 60)
    
    # Test service
    if not test_health():
        print("\n❌ Service is not running. Start with: ./start.sh")
        return
    
    # Show configuration
    show_config()
    
    # Get enrollment stats
    num_students = get_encoding_stats()
    
    # Test detection
    test_detection()
    
    print("\n" + "=" * 60)
    print("📋 Next Steps:")
    print("=" * 60)
    
    if num_students > 0:
        print("""
1. ✅ Current Setup:
   - Using improved full-resolution encoding
   - Fixed threshold logic (no more double-filtering)
   - Minimum face size gate (80px)
   - {num_students} students enrolled

2. 🔄 To get MAXIMUM quality improvement:
   Re-enroll all students to use new high-quality settings:
   
   Option A: Via Web UI
   - Go to http://localhost:3000
   - Navigate to student management
   - Re-enroll all students
   
   Option B: Via API (if you have student list)
   - POST to /embed-students with student data
   - New encodings will use num_jitters=5 + model='large'
   
3. 🎯 Test Recognition:
   - Start a session
   - Check confidence scores (should be 0.60+ for correct matches)
   - Monitor logs for "Skipping face: too small" messages
   
4. ⚡ Try Better Detectors:
   
   For CNN (better quality, slower):
   Edit .env: DETECTOR_BACKEND=cnn
   Then: ./stop.sh && ./start.sh
   
   For YOLO (best quality, needs GPU):
   Edit .env: DETECTOR_BACKEND=yolo
              DETECTOR_DEVICE=cuda  (or cpu for testing)
   Then: ./stop.sh && ./start.sh
        """.format(num_students=num_students))
    else:
        print("""
No students enrolled yet!

Enroll students via:
- Web UI: http://localhost:3000
- API: POST to /embed-students

New enrollments will automatically use:
- num_jitters=5 (higher quality)
- model='large' (better accuracy)
- Largest face selection (avoids background)
        """)
    
    print("\n📖 For detailed info, see: QUALITY_IMPROVEMENTS.md")
    print("=" * 60)

if __name__ == "__main__":
    main()
