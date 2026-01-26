import subprocess
import threading
import time
from queue import Queue
from typing import Optional
import numpy as np
import cv2

class CameraStreamFFmpeg:
    """Camera stream using FFmpeg subprocess - more stable than cv2.VideoCapture"""
    
    def __init__(self, rtsp_url: str, frame_queue_size: int = 2):
        self.rtsp_url = rtsp_url
        self.frame_queue = Queue(maxsize=frame_queue_size)
        self.process = None
        self.thread = None
        self.running = False
        self.width = 1920
        self.height = 1080
    
    def connect(self):
        """Start FFmpeg process to read RTSP stream"""
        print(f"🔗 Connecting via FFmpeg to camera...")
        
        # FFmpeg command to read RTSP and output raw frames
        command = [
            'ffmpeg',
            '-rtsp_transport', 'tcp',  # Use TCP for more stability
            '-i', self.rtsp_url,
            '-f', 'image2pipe',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-s', f'{self.width}x{self.height}',
            '-r', '5',  # 5 FPS
            '-'
        ]
        
        try:
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8
            )
            print("✅ FFmpeg process started successfully")
        except Exception as e:
            print(f"❌ FFmpeg connection error: {e}")
            raise
    
    def start_stream(self):
        """Start streaming in background thread"""
        self.running = True
        self.thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.thread.start()
        print("▶️  FFmpeg stream started")
    
    def _stream_loop(self):
        """Read frames continuously from FFmpeg"""
        frame_size = self.width * self.height * 3  # 3 bytes per pixel (BGR)
        
        while self.running:
            try:
                # Read raw frame data
                raw_frame = self.process.stdout.read(frame_size)
                
                if len(raw_frame) != frame_size:
                    print("⚠️ Incomplete frame, reconnecting...")
                    self.stop_stream()
                    time.sleep(2)
                    try:
                        self.connect()
                        self.start_stream()
                    except:
                        break
                    continue
                
                # Convert to numpy array
                frame = np.frombuffer(raw_frame, dtype=np.uint8)
                frame = frame.reshape((self.height, self.width, 3))
                
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
                print(f"⚠️ FFmpeg stream error: {e}")
                time.sleep(2)
    
    def get_frame(self) -> Optional[np.ndarray]:
        """Get latest frame from queue"""
        try:
            return self.frame_queue.get(timeout=1)
        except:
            return None
    
    def stop_stream(self):
        """Stop streaming"""
        self.running = False
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except:
                self.process.kill()
        if self.thread:
            self.thread.join(timeout=5)
        print("⏹️  FFmpeg stream stopped")
