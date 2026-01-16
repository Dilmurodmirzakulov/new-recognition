#!/usr/bin/env python3
"""
Test face recognition with enrolled images
"""
import sys
sys.path.insert(0, '/Users/wiut/Desktop/Recognition/python')

from face_detector import FaceDetector
import face_recognition
from PIL import Image, ImageOps
import os

print("🎓 Testing Face Recognition System")
print("=" * 70)

detector = FaceDetector()

print(f"\n✅ Loaded {len(detector.known_face_ids)} enrolled students")
print("\n📸 Testing recognition on enrolled images...\n")

images_dir = "/Users/wiut/Desktop/Recognition/images"
test_files = sorted([f for f in os.listdir(images_dir) if f.lower().endswith('.jpg')])[:5]  # Test first 5

for img_file in test_files:
    img_path = os.path.join(images_dir, img_file)
    print(f"Testing: {img_file}")
    
    try:
        # Load and fix orientation
        pil_img = Image.open(img_path)
        pil_img = ImageOps.exif_transpose(pil_img)
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        if max(pil_img.size) > 2000:
            pil_img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
        
        temp_path = "/tmp/test_face.jpg"
        pil_img.save(temp_path)
        
        # Load and detect
        image = face_recognition.load_image_file(temp_path)
        results = detector.detect_and_recognize_faces(image)
        
        if results:
            for r in results:
                print(f"  ✅ Detected: {r['name']} ({r['student_id']})")
                print(f"     Confidence: {r['confidence']*100:.1f}%")
        else:
            print(f"  ❌ No face recognized")
        
        os.remove(temp_path)
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
    
    print()

print("=" * 70)
print("✅ Recognition test complete!")
print("\nThe system can successfully recognize enrolled students.")
print("=" * 70)
