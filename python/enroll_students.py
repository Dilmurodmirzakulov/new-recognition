"""
Student Enrollment Script
Place student photos in python/photos/ directory and update the students list below
"""
from face_detector import FaceDetector
import os

print("🎓 Student Enrollment System")
print("=" * 50)

detector = FaceDetector()

# Sample student data - UPDATE THIS with your students
students = [
    {"id": "STU001", "name": "John Doe", "photo": "photos/john.jpg"},
    {"id": "STU002", "name": "Jane Smith", "photo": "photos/jane.jpg"},
    {"id": "STU003", "name": "Bob Johnson", "photo": "photos/bob.jpg"},
    # Add more students here
]

print(f"\n📋 Found {len(students)} students to enroll")
print("")

enrolled_count = 0
failed_count = 0

for student in students:
    photo_path = student["photo"]
    student_id = student["id"]
    student_name = student["name"]
    
    print(f"Processing: {student_name} ({student_id})...")
    
    if not os.path.exists(photo_path):
        print(f"  ⚠️  Photo not found: {photo_path}")
        failed_count += 1
        continue
    
    try:
        detector.enroll_student(photo_path, student_id, student_name)
        enrolled_count += 1
        print(f"  ✅ Enrolled successfully!")
    except ValueError as e:
        print(f"  ❌ Error: {e}")
        failed_count += 1
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        failed_count += 1
    
    print("")

print("=" * 50)
print(f"📊 Enrollment Summary:")
print(f"  ✅ Successful: {enrolled_count}")
print(f"  ❌ Failed: {failed_count}")
print(f"  📝 Total enrolled in system: {len(detector.known_face_ids)}")
print("")
print("💡 To add more students:")
print("  1. Place their photos in python/photos/")
print("  2. Update the students list in this script")
print("  3. Run: python enroll_students.py")
