#!/usr/bin/env python3
"""
Sync enrolled students from face encodings to PostgreSQL database
"""
import os
import sys
import pickle
import psycopg2
from datetime import datetime

# Load face encodings
encodings_path = "/Users/wiut/Desktop/Recognition/python/encodings/known_faces.pkl"

if not os.path.exists(encodings_path):
    print("❌ No encodings file found!")
    sys.exit(1)

with open(encodings_path, 'rb') as f:
    data = pickle.load(f)
    known_face_ids = data.get("ids", [])
    known_face_names = data.get("names", [])

print(f"📋 Found {len(known_face_ids)} students in face encodings")

# Get image files
images_dir = "/Users/wiut/Desktop/Recognition/images"
image_files = sorted([f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

# Connect to database
db_url = os.getenv('DATABASE_URL', 'postgresql://attendance_user:secure_password_123@localhost:5432/yuksalish_attendance')

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    # Ensure students table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            class VARCHAR(50),
            face_encoding_id VARCHAR(100),
            photo_path VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    conn.commit()
    
    # Sync students
    synced = 0
    skipped = 0
    
    for idx, (student_id, student_name) in enumerate(zip(known_face_ids, known_face_names), 1):
        try:
            # Check if student already exists
            cursor.execute("SELECT id FROM students WHERE student_id = %s", (student_id,))
            if cursor.fetchone():
                skipped += 1
                continue
            
            # Get corresponding image
            photo_path = image_files[idx - 1] if idx <= len(image_files) else None
            
            # Insert student
            cursor.execute("""
                INSERT INTO students (student_id, name, class, face_encoding_id, photo_path)
                VALUES (%s, %s, %s, %s, %s)
            """, (student_id, student_name, '10-A', student_id, photo_path))
            
            synced += 1
            print(f"✅ Synced: {student_name} ({student_id})")
            
        except Exception as e:
            print(f"⚠️ Error syncing {student_id}: {e}")
    
    conn.commit()
    
    print(f"\n✅ Sync complete!")
    print(f"   - {synced} students added")
    print(f"   - {skipped} students already existed")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Database error: {e}")
    sys.exit(1)
