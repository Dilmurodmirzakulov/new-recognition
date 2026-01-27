"""
YOLO-based face detector for improved detection quality
Supports CPU and GPU modes via device selection
"""
import cv2
import numpy as np
from typing import List, Tuple
import os


class YOLOFaceDetector:
    """Face detector using Ultralytics YOLO models"""
    
    def __init__(self, model_name: str = "yolov8n-face.pt", device: str = "cpu"):
        """
        Initialize YOLO face detector
        
        Args:
            model_name: YOLO model name (e.g., 'yolov8n-face.pt', 'yolov8s-face.pt')
            device: 'cpu' or 'cuda' for GPU
        """
        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError(
                "Ultralytics YOLO not installed. Install with: pip install ultralytics"
            )
        
        self.device = device
        print(f"🤖 Loading YOLO face detector: {model_name} on {device}")
        
        # Load model
        self.model = YOLO(model_name)
        
        # Move to device
        if device == "cuda":
            self.model.to("cuda")
        else:
            self.model.to("cpu")
            
        print(f"✅ YOLO face detector loaded on {device}")
    
    def detect(self, frame: np.ndarray, conf_threshold: float = 0.5) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in frame
        
        Args:
            frame: OpenCV BGR image
            conf_threshold: Minimum confidence for detection
        
        Returns:
            List of face bounding boxes as (top, right, bottom, left) tuples
            matching face_recognition format
        """
        # Run YOLO inference
        results = self.model(frame, conf=conf_threshold, verbose=False)
        
        face_locations = []
        
        # Extract face bounding boxes
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            
            for box in boxes:
                # Get xyxy format
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Convert to (top, right, bottom, left) format to match face_recognition
                top = int(y1)
                right = int(x2)
                bottom = int(y2)
                left = int(x1)
                
                face_locations.append((top, right, bottom, left))
        
        return face_locations
    
    def detect_largest(self, frame: np.ndarray, conf_threshold: float = 0.5) -> Tuple[int, int, int, int]:
        """
        Detect and return the largest face in frame
        
        Args:
            frame: OpenCV BGR image
            conf_threshold: Minimum confidence for detection
        
        Returns:
            Largest face bounding box as (top, right, bottom, left) or None
        """
        face_locations = self.detect(frame, conf_threshold)
        
        if not face_locations:
            return None
        
        # Find largest face by area
        largest_face = max(
            face_locations,
            key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3])
        )
        
        return largest_face
