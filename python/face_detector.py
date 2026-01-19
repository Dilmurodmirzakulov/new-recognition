import cv2
import face_recognition
import numpy as np
from pathlib import Path
import pickle
import os
import psycopg2
from typing import Optional

class FaceDetector:
    def __init__(self, encodings_path="encodings/known_faces.pkl"):
        self.encodings_path = encodings_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.db_url = os.getenv('DATABASE_URL', 'postgresql://attendance_user:secure_password_123@localhost:5432/yuksalish_attendance')
        self.load_encodings()
    
    def get_student_name_from_db(self, student_id: str) -> Optional[str]:
        """Get current student name from database"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM students WHERE student_id = %s", (student_id,))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return result[0] if result else None
        except Exception as e:
            print(f"⚠️ Database error: {e}")
            return None
    
    def load_encodings(self):
        """Load pre-calculated face encodings from file"""
        if os.path.exists(self.encodings_path):
            with open(self.encodings_path, 'rb') as f:
                data = pickle.load(f)
                self.known_face_encodings = data.get("encodings", [])
                self.known_face_names = data.get("names", [])
                self.known_face_ids = data.get("ids", [])
            print(f"✅ Loaded {len(self.known_face_encodings)} face encodings")
        else:
            print("⚠️ No encodings file found. Students must be enrolled first.")
    
    def detect_and_recognize_faces(self, frame, confidence_threshold=0.5):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: OpenCV image frame
            confidence_threshold: Minimum confidence to mark as recognized (lowered to 0.5 for better detection)
        
        Returns:
            List of dicts with student_id, name, confidence, bbox
        """
        # Process at 50% resolution for better performance (was 75%)
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces with 1x upsampling for performance (was 3x)
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog", number_of_times_to_upsample=1)
        
        if not face_locations:
            return []
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        results = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare faces with more lenient tolerance for better recognition
            matches = face_recognition.compare_faces(
                self.known_face_encodings, 
                face_encoding,
                tolerance=0.6  # More lenient tolerance for better recognition at distance
            )
            face_distances = face_recognition.face_distance(
                self.known_face_encodings, 
                face_encoding
            )
            
            name = "Unknown"
            student_id = None
            confidence = 0
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                confidence = 1 - face_distances[best_match_index]
                
                # Lower confidence threshold for better recognition
                if matches[best_match_index] and confidence >= confidence_threshold:
                    student_id = self.known_face_ids[best_match_index]
                    # Get current name from database instead of cached name
                    name = self.get_student_name_from_db(student_id)
                    if name is None:
                        # Fallback to cached name if database query fails
                        name = self.known_face_names[best_match_index]
            
            # Scale back up face coordinates (adjusted for 0.5x scaling)
            scale_factor = 1 / 0.5
            top = int(top * scale_factor)
            right = int(right * scale_factor)
            bottom = int(bottom * scale_factor)
            left = int(left * scale_factor)
            
            results.append({
                "student_id": student_id,
                "name": name,
                "confidence": float(confidence),
                "bbox": {"top": top, "right": right, "bottom": bottom, "left": left}
            })
        
        return results
    
    def enroll_student(self, image_path, student_id, student_name):
        """
        Enroll a new student by encoding their face
        
        Args:
            image_path: Path to student photo
            student_id: Student ID
            student_name: Student name
        """
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if not face_encodings:
            raise ValueError(f"No face detected in {image_path}")
        
        if len(face_encodings) > 1:
            raise ValueError(f"Multiple faces detected in {image_path}. Use single face image.")
        
        # Add to known faces
        self.known_face_encodings.append(face_encodings[0])
        self.known_face_names.append(student_name)
        self.known_face_ids.append(student_id)
        
        # Save encodings
        os.makedirs(os.path.dirname(self.encodings_path), exist_ok=True)
        with open(self.encodings_path, 'wb') as f:
            pickle.dump({
                "encodings": self.known_face_encodings,
                "names": self.known_face_names,
                "ids": self.known_face_ids
            }, f)
        
        print(f"✅ Enrolled: {student_name} (ID: {student_id})")
    
    def remove_student(self, student_id):
        """Remove a student from face database"""
        indices = [i for i, id_ in enumerate(self.known_face_ids) if id_ == student_id]
        
        for idx in reversed(indices):
            del self.known_face_encodings[idx]
            del self.known_face_names[idx]
            del self.known_face_ids[idx]
        
        # Save updated encodings
        with open(self.encodings_path, 'wb') as f:
            pickle.dump({
                "encodings": self.known_face_encodings,
                "names": self.known_face_names,
                "ids": self.known_face_ids
            }, f)
        
        print(f"✅ Removed student ID: {student_id}")
