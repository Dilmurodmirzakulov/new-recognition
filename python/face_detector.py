import cv2
import face_recognition
import numpy as np
from pathlib import Path
import pickle
import os
from typing import Optional, List, Dict, Tuple

class FaceDetector:
    def __init__(self, encodings_path="encodings/known_faces.pkl"):
        self.encodings_path = encodings_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        
        # Detector configuration from environment
        self.detector_backend = os.getenv("DETECTOR_BACKEND", "hog").lower()  # hog, cnn, or yolo
        self.detector_device = os.getenv("DETECTOR_DEVICE", "cpu").lower()  # cpu or cuda
        self.min_face_size = int(os.getenv("MIN_FACE_SIZE", "80"))  # Minimum face width in pixels
        
        # Lazy-load YOLO detector if selected
        self.yolo_detector = None
        if self.detector_backend == "yolo":
            self._init_yolo_detector()
        
        print(f"🔍 Face detector: {self.detector_backend.upper()} on {self.detector_device.upper()}")
        print(f"📏 Minimum face size: {self.min_face_size}px")
        
        self.load_encodings()
    
    def _init_yolo_detector(self):
        """Initialize YOLO face detector"""
        try:
            from yolo_face_detector import YOLOFaceDetector
            device = "cuda" if self.detector_device == "cuda" else "cpu"
            self.yolo_detector = YOLOFaceDetector(model_name="yolov8n-face.pt", device=device)
        except Exception as e:
            print(f"⚠️ Failed to load YOLO detector: {e}")
            print(f"⚠️ Falling back to HOG detector")
            self.detector_backend = "hog"
    
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
                
            # Detect faces using configured backend
            face_locations = self._detect_faces(rgb_image)
            
            if not face_locations:
                print(f"⚠️ No face found for student {student_id}")
                return False
            
            # Select the largest face (to avoid background faces)
            largest_face = max(
                face_locations,
                key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3])
            )
            
            # Get encodings with higher quality settings for enrollment
            encodings = face_recognition.face_encodings(
                rgb_image, 
                [largest_face],
                num_jitters=5,  # More jitters = better quality, slower
                model="large"   # Use large model for better accuracy
            )
            
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
    
    def _detect_faces(self, rgb_image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces using configured backend"""
        if self.detector_backend == "yolo" and self.yolo_detector:
            return self.yolo_detector.detect(rgb_image)
        elif self.detector_backend == "cnn":
            return face_recognition.face_locations(rgb_image, model="cnn")
        else:  # hog (default)
            return face_recognition.face_locations(rgb_image, model="hog")
    
    def detect_and_recognize_faces(self, frame, confidence_threshold=0.5):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: OpenCV image frame
            confidence_threshold: Minimum confidence to mark as recognized
        
        Returns:
            List of dicts with student_id, name, confidence, bbox
        """
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces on smaller frame for speed
        small_frame = cv2.resize(rgb_frame, (0, 0), fx=0.5, fy=0.5)
        face_locations_small = self._detect_faces(small_frame)
        
        if not face_locations_small:
            return []
        
        # Scale face locations back to original frame size
        scale_factor = 2.0
        face_locations_full = [
            (
                int(top * scale_factor),
                int(right * scale_factor),
                int(bottom * scale_factor),
                int(left * scale_factor)
            )
            for top, right, bottom, left in face_locations_small
        ]
        
        # Filter out faces that are too small (quality gate)
        valid_faces = []
        for loc in face_locations_full:
            top, right, bottom, left = loc
            face_width = right - left
            face_height = bottom - top
            if face_width >= self.min_face_size and face_height >= self.min_face_size:
                valid_faces.append(loc)
            else:
                print(f"⚠️ Skipping face: too small ({face_width}x{face_height}px, min={self.min_face_size}px)")
        
        if not valid_faces:
            return []
        
        # Get face encodings from ORIGINAL FULL-RES frame (not downscaled)
        face_encodings = face_recognition.face_encodings(rgb_frame, valid_faces, num_jitters=1)
        
        results = []
        
        # Use tolerance consistently (default 0.6 = distance threshold)
        # Aligned confidence_threshold: 1 - 0.6 = 0.4
        tolerance = 0.6
        aligned_confidence_threshold = 1 - tolerance
        
        for (top, right, bottom, left), face_encoding in zip(valid_faces, face_encodings):
            # Compare faces
            face_distances = face_recognition.face_distance(
                self.known_face_encodings, 
                face_encoding
            )
            
            name = "Unknown"
            student_id = None
            confidence = 0
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                best_distance = face_distances[best_match_index]
                confidence = 1 - best_distance
                
                # Use single tolerance check (no double-filtering)
                if best_distance <= tolerance:
                    student_id = self.known_face_ids[best_match_index]
                    name = self.known_face_names[best_match_index]
            
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
