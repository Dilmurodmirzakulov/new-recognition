#!/usr/bin/env python3
"""
Display enrolled students with their images
"""
import os
import sys
import shutil
from pathlib import Path

sys.path.insert(0, '/Users/wiut/Desktop/Recognition/python')

from face_detector import FaceDetector

# Initialize detector
detector = FaceDetector(encodings_path="/Users/wiut/Desktop/Recognition/python/encodings/known_faces.pkl")

print("=" * 80)
print("📋 ENROLLED STUDENTS LIST")
print("=" * 80)
print()

if not detector.known_face_ids:
    print("❌ No students enrolled yet!")
    sys.exit(0)

# Map student IDs to image files
images_dir = "/Users/wiut/Desktop/Recognition/images"
image_files = sorted([f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

print(f"Total Enrolled: {len(detector.known_face_ids)} students\n")
print("-" * 80)

for idx, (student_id, student_name) in enumerate(zip(detector.known_face_ids, detector.known_face_names), 1):
    # Get corresponding image
    if idx <= len(image_files):
        image_file = image_files[idx - 1]
        image_path = os.path.join(images_dir, image_file)
    else:
        image_file = "Not found"
        image_path = None
    
    print(f"{idx:2d}. Student ID: {student_id}")
    print(f"    Name:      {student_name}")
    print(f"    Image:     {image_file}")
    if image_path and os.path.exists(image_path):
        size = os.path.getsize(image_path) / 1024
        print(f"    Size:      {size:.1f} KB")
    print()

print("-" * 80)
print(f"✅ {len(detector.known_face_ids)} students enrolled and ready for attendance tracking")
print("=" * 80)

# Create HTML view
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enrolled Students - Yuksalish Attendance</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            font-size: 1.2em;
        }
        .stats {
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-around;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 1.1em;
            margin-top: 5px;
        }
        .students-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
        }
        .student-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .student-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .student-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            background: #f0f0f0;
        }
        .student-info {
            padding: 20px;
        }
        .student-id {
            font-weight: bold;
            color: #667eea;
            font-size: 1.3em;
            margin-bottom: 8px;
        }
        .student-name {
            color: #333;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .back-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
        }
        .back-button:hover {
            background: #764ba2;
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Enrolled Students</h1>
            <p>Yuksalish Classroom Attendance System</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">TOTAL_STUDENTS</div>
                <div class="stat-label">Enrolled Students</div>
            </div>
            <div class="stat">
                <div class="stat-number">✅</div>
                <div class="stat-label">System Ready</div>
            </div>
        </div>
        
        <div class="students-grid">
STUDENT_CARDS
        </div>
    </div>
    
    <a href="http://localhost:3000" class="back-button">📊 Go to Dashboard →</a>
</body>
</html>
"""

# Generate student cards
cards_html = ""
for idx, (student_id, student_name) in enumerate(zip(detector.known_face_ids, detector.known_face_names), 1):
    if idx <= len(image_files):
        image_file = image_files[idx - 1]
        image_rel_path = f"images/{image_file}"
    else:
        image_rel_path = "placeholder.jpg"
    
    card = f"""
            <div class="student-card">
                <img src="{image_rel_path}" alt="{student_name}" class="student-image">
                <div class="student-info">
                    <div class="student-id">{student_id}</div>
                    <div class="student-name">{student_name}</div>
                    <span class="badge">✓ Enrolled</span>
                </div>
            </div>
"""
    cards_html += card

# Replace placeholders
html_content = html_content.replace("TOTAL_STUDENTS", str(len(detector.known_face_ids)))
html_content = html_content.replace("STUDENT_CARDS", cards_html)

# Save HTML file
output_file = "/Users/wiut/Desktop/Recognition/students_list.html"
with open(output_file, 'w') as f:
    f.write(html_content)

print()
print(f"📄 HTML page created: {output_file}")
print(f"🌐 Opening in browser...")

# Open in browser
import webbrowser
webbrowser.open(f"file://{output_file}")

print()
print("✅ Done!")
