import cv2
import threading
import time
from queue import Queue
from typing import Optional

class CameraStream:
    def __init__(self, rtsp_url: str, frame_queue_size: int = 1):
        self.rtsp_url = rtsp_url
        self.frame_queue = Queue(maxsize=frame_queue_size)
        self.cap = None
        self.thread = None
        self.running = False
    
    def connect(self):
        """Connect to RTSP stream"""
        print(f"🔗 Connecting to: {self.rtsp_url[:50]}...")
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            
            if not self.cap.isOpened():
                raise ConnectionError("❌ Failed to connect to camera")
            
            # Set video properties for faster processing
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer
            self.cap.set(cv2.CAP_PROP_FPS, 3)  # 3 FPS for better performance (was 5)
            
            print("✅ Camera connected successfully")
        except Exception as e:
            print(f"❌ Connection error: {e}")
            raise
    
    def start_stream(self):
        """Start streaming in background thread"""
        self.running = True
        self.thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.thread.start()
        print("▶️  Stream started")
    
    def _stream_loop(self):
        """Read frames continuously"""
        while self.running:
            try:
                ret, frame = self.cap.read()
                
                if not ret:
                    print("⚠️ Failed to read frame, reconnecting...")
                    self.cap.release()
                    time.sleep(2)
                    try:
                        self.connect()
                    except Exception as e:
                        print(f"⚠️ Reconnection failed: {e}")
                        time.sleep(5)
                        continue
                
                # Empty queue if full (drop old frames)
                if self.frame_queue.full():
                    try:
                        self.frame_queue.get_nowait()
                    except:
                        pass
                
                try:
                    self.frame_queue.put(frame, timeout=1)
                except:
                    pass
            except Exception as e:
                print(f"⚠️ Stream loop error: {e}")
                time.sleep(2)
    
    def get_frame(self) -> Optional:
        """Get latest frame from queue"""
        try:
            return self.frame_queue.get(timeout=1)
        except:
            return None
    
    def stop_stream(self):
        """Stop streaming"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        if self.cap:
            self.cap.release()
        print("⏹️  Stream stopped")
