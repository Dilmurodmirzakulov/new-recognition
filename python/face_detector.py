import cv2
import face_recognition
import numpy as np
from pathlib import Path
import pickle
import os
from typing import Optional, List, Dict

class FaceDetector:
    def __init__(self, encodings_path="encodings/known_faces.pkl"):
        self.encodings_path = encodings_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.load_encodings()
    
    def load_encodings(self):
        """Load pre-calculated face encodings from file"""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.encodings_path), exist_ok=True)
        
        if os.path.exists(self.encodings_path):
            with open(self.encodings_path, 'rb') as f:
                data = pickle.load(f)
                self.known_face_encodings = data.get("encodings", [])
                self.known_face_names = data.get("names", [])
                self.known_face_ids = data.get("ids", [])
            print(f"✅ Loaded {len(self.known_face_encodings)} face encodings")
        else:
            print("⚠️ No encodings file found. New file will be created when students are enrolled.")
            self.known_face_encodings = []
            self.known_face_names = []
            self.known_face_ids = []

    def save_encodings(self):
        """Save face encodings to file"""
        data = {
            "encodings": self.known_face_encodings,
            "names": self.known_face_names,
            "ids": self.known_face_ids
        }
        with open(self.encodings_path, 'wb') as f:
            pickle.dump(data, f)
        print(f"✅ Saved {len(self.known_face_encodings)} encodings to {self.encodings_path}")

    def add_student_encoding(self, student_id: str, name: str, image: np.ndarray) -> bool:
        """
        Add a student encoding from an image array
        
        Args:
            student_id: Student ID
            name: Student name
            image: OpenCV BGR image or RGB image
            
        Returns:
            bool: True if face found and encoded, False otherwise
        """
        try:
            # Validate image
            if image is None or image.size == 0:
                print(f"⚠️ Invalid image for student {student_id}")
                return False
                
            # Convert to RGB if needed (OpenCV loads as BGR)
            if len(image.shape) == 3 and image.shape[2] == 3:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image
                
            # Detect faces
            face_locations = face_recognition.face_locations(rgb_image, model="hog")
            
            if not face_locations:
                print(f"⚠️ No face found for student {student_id}")
                return False
                
            # Get encodings (use the first face found)
            encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            if not encodings:
                print(f"⚠️ Failed to encode face for student {student_id}")
                return False
                
            # Add to known lists
            # Check if ID already exists and update it
            if student_id in self.known_face_ids:
                index = self.known_face_ids.index(student_id)
                self.known_face_encodings[index] = encodings[0]
                self.known_face_names[index] = name
                print(f"Updated encoding for student {student_id}")
            else:
                self.known_face_encodings.append(encodings[0])
                self.known_face_ids.append(student_id)
                self.known_face_names.append(name)
                print(f"Added new encoding for student {student_id}")
                
            return True
        except Exception as e:
            print(f"❌ Error encoding face for {student_id}: {e}")
            return False
    
    def detect_and_recognize_faces(self, frame, confidence_threshold=0.5):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: OpenCV image frame
            confidence_threshold: Minimum confidence to mark as recognized
        
        Returns:
            List of dicts with student_id, name, confidence, bbox
        """
        # Process at 50% resolution for better performance
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog", number_of_times_to_upsample=1)
        
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
                    student_id = self.known_face_ids[best_match_index]
                    name = self.known_face_names[best_match_index]
            
            # Scale back up face coordinates
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
    
    def get_face_encoding(self, image_path: str) -> Optional[List[float]]:
        """
        Get face encoding from an image file
        
        Args:
            image_path: Path to the image file
        
        Returns:
            Face encoding as list of floats, or None if no face detected
        """
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if not face_encodings:
            return None
        
        return face_encodings[0].tolist()
    
    def compare_encoding(self, encoding1: List[float], encoding2: List[float], tolerance: float = 0.6) -> Dict:
        """
        Compare two face encodings
        
        Args:
            encoding1: First face encoding
            encoding2: Second face encoding
            tolerance: Distance tolerance for matching
        
        Returns:
            Dict with match result and confidence
        """
        enc1 = np.array(encoding1)
        enc2 = np.array(encoding2)
        
        distance = face_recognition.face_distance([enc1], enc2)[0]
        confidence = 1 - distance
        is_match = distance <= tolerance
        
        return {
            "match": is_match,
            "confidence": float(confidence),
            "distance": float(distance)
        }
