#!/usr/bin/env python3
"""
Fixed enrollment with EXIF orientation handling
"""
import os
import sys
import pickle

sys.path.insert(0, '/Users/wiut/Desktop/Recognition/python')

import face_recognition
from PIL import Image, ImageOps

print("🎓 Student Enrollment System (Fixed)")
print("=" * 70)

images_dir = "/Users/wiut/Desktop/Recognition/images"
encodings_path = "/Users/wiut/Desktop/Recognition/python/encodings/known_faces.pkl"

image_files = sorted([f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
print(f"\n📸 Found {len(image_files)} images\n")

known_face_encodings = []
known_face_names = []
known_face_ids = []

enrolled = 0
failed = 0

for idx, image_file in enumerate(image_files, 1):
    student_id = f"STU{idx:03d}"
    student_name = f"Student {idx}"
    image_path = os.path.join(images_dir, image_file)
    
    print(f"[{idx:2d}/{len(image_files)}] {image_file}")
    print(f"        ID: {student_id}, Name: {student_name}")
    
    try:
        # Load with PIL and fix orientation
        pil_img = Image.open(image_path)
        
        # Apply EXIF transpose (fixes rotation)
        pil_img = ImageOps.exif_transpose(pil_img)
        
        # Convert to RGB if needed
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        # Resize if too large (for faster processing)
        if max(pil_img.size) > 2000:
            pil_img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
        
        # Save temp corrected file
        temp_path = f"/tmp/temp_enroll_{idx}.jpg"
        pil_img.save(temp_path)
        
        # Load with face_recognition
        image = face_recognition.load_image_file(temp_path)
        
        # Detect faces
        face_locs = face_recognition.face_locations(image, model="hog")
        
        if not face_locs:
            print(f"        ❌ No face detected\n")
            failed += 1
            continue
        
        if len(face_locs) > 1:
            print(f"        ⚠️  Found {len(face_locs)} faces, using largest")
        
        # Get encodings
        encodings = face_recognition.face_encodings(image, face_locs)
        
        if encodings:
            known_face_encodings.append(encodings[0])
            known_face_names.append(student_name)
            known_face_ids.append(student_id)
            enrolled += 1
            print(f"        ✅ Enrolled successfully!\n")
        else:
            print(f"        ❌ Could not encode face\n")
            failed += 1
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    except Exception as e:
        print(f"        ❌ Error: {str(e)[:60]}\n")
        failed += 1

# Save encodings
if enrolled > 0:
    os.makedirs(os.path.dirname(encodings_path), exist_ok=True)
    with open(encodings_path, 'wb') as f:
        pickle.dump({
            "encodings": known_face_encodings,
            "names": known_face_names,
            "ids": known_face_ids
        }, f)
    print(f"💾 Saved encodings to: {encodings_path}")

print("=" * 70)
print(f"📊 Summary:")
print(f"   ✅ Successfully Enrolled: {enrolled}")
print(f"   ❌ Failed: {failed}")
print(f"   📝 Total in System: {len(known_face_ids)}")
print("=" * 70)

if enrolled > 0:
    print("\n🎉 Students enrolled! You can now use the attendance system.")
    print("   Open: http://localhost:3000")
else:
    print("\n⚠️  No students enrolled. Please check image quality.")
