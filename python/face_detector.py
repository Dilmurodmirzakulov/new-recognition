import cv2
import face_recognition
import numpy as np
from pathlib import Path
import pickle
import os

class FaceDetector:
    def __init__(self, encodings_path="encodings/known_faces.pkl"):
        self.encodings_path = encodings_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.load_encodings()
    
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
    
    def detect_and_recognize_faces(self, frame, confidence_threshold=0.6):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: OpenCV image frame
            confidence_threshold: Minimum confidence to mark as recognized
        
        Returns:
            List of dicts with student_id, name, confidence, bbox
        """
        # Resize frame for faster processing (H.265 4K → smaller)
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
        
        if not face_locations:
            return []
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        results = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare faces
            matches = face_recognition.compare_faces(
                self.known_face_encodings, 
                face_encoding,
                tolerance=0.6
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
                
                if matches[best_match_index] and confidence >= confidence_threshold:
                    name = self.known_face_names[best_match_index]
                    student_id = self.known_face_ids[best_match_index]
            
            # Scale back up face coordinates
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
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
