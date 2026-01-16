"""
Test script to verify camera connection
"""
import cv2

# Camera credentials
RTSP_URL = "rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/101"

print("🎥 Testing camera connection...")
print(f"📹 URL: {RTSP_URL}")

cap = cv2.VideoCapture(RTSP_URL)

if cap.isOpened():
    print("✅ Camera connected successfully!")
    
    # Try to read a frame
    ret, frame = cap.read()
    if ret:
        print(f"✅ Frame captured! Resolution: {frame.shape[1]}x{frame.shape[0]}")
    else:
        print("⚠️ Could not read frame")
    
    cap.release()
else:
    print("❌ Failed to connect to camera")
    print("\nTroubleshooting:")
    print("1. Check if camera IP is correct: 192.168.34.196")
    print("2. Verify credentials: admin / 1qaz2wsx@")
    print("3. Ensure camera is on the same network")
    print("4. Try accessing camera web interface: http://192.168.34.196")
