'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceService } from '@/lib/api';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, UserCheck, UserX, Loader2, Play, Pause, Square, Video, VideoOff, Maximize, Minimize, Scan, ScanLine, Users, Camera, Settings, RotateCcw, Search, Filter, ZoomIn, ZoomOut, RotateCw, Move, Target, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Home, Gamepad2 } from 'lucide-react';

interface Student {
  userId: string;
  fullName: string;
  isAttended: boolean;
  confidence: number;
  faceEmbedders: string;
}

interface DetectionResult {
  student_id: string;
  name: string;
  confidence: number;
  bbox: { top: number; right: number; bottom: number; left: number };
}

export default function LiveSession({ params }: { params: Promise<{ guidId: string; classId: string }> }) {
  const { guidId, classId } = use(params);
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [detectedCount, setDetectedCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [processingStudent, setProcessingStudent] = useState<string | null>(null);
  const [autoDetection, setAutoDetection] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [detectionThreshold, setDetectionThreshold] = useState(50);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 }); // Percentage from top-left
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showPtzControls, setShowPtzControls] = useState(false);
  const [ptzSpeed, setPtzSpeed] = useState(4);
  const [isPtzMoving, setIsPtzMoving] = useState(false);
  const [patrolActive, setPatrolActive] = useState(false);
  const [patrolPresets, setPatrolPresets] = useState('1,2,3');
  const [patrolDwell, setPatrolDwell] = useState(5);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLImageElement>(null);

  // Track which students we've already sent attendance for (to avoid duplicates)
  const attendedStudentsRef = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll patrol status every 2 seconds
  useEffect(() => {
    const interval = setInterval(checkPatrolStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await attendanceService.getStudents(guidId, parseInt(classId));
      const studentList = Array.isArray(data) ? data : [];
      setStudents(studentList);

      // Update attended count
      const attended = studentList.filter((s: Student) => s.isAttended).length;
      setAttendedCount(attended);

      // Update our local tracking set with already attended students
      studentList.forEach((s: Student) => {
        if (s.isAttended) {
          attendedStudentsRef.current.add(s.userId);
        }
      });
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, [guidId, classId]);

  const startCamera = async () => {
    try {
      await fetch('http://localhost:5000/start', { method: 'POST' });
      setCameraActive(true);
    } catch (e) {
      console.error("Failed to start camera", e);
    }
  };

  const stopCamera = async () => {
    try {
      await fetch('http://localhost:5000/stop', { method: 'POST' });
      setCameraActive(false);
    } catch (e) {
      console.error("Failed to stop camera", e);
    }
  };

  // Poll for face detections and auto-record attendance
  const pollDetections = useCallback(async () => {
    if (!cameraActive || !autoDetection) return;

    try {
      const response = await fetch('http://localhost:5000/detect', { method: 'POST' });
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setDetectedCount(data.results.length);

        // Process each detected face
        for (const result of data.results as DetectionResult[]) {
          const studentId = result.student_id;
          const confidence = result.confidence * 100; // Convert to percentage

          // If confidence > threshold and we haven't already recorded this student
          if (confidence > detectionThreshold && studentId && !attendedStudentsRef.current.has(studentId)) {
            console.log(`Recording attendance for ${studentId} with ${confidence.toFixed(0)}% confidence`);

            try {
              await attendanceService.recordAttendance(
                parseInt(classId),
                studentId,
                Math.round(confidence)
              );

              // Add to our tracking set
              attendedStudentsRef.current.add(studentId);

              // Fetch fresh data from API
              await fetchStudents();
            } catch (error) {
              console.error(`Failed to record attendance for ${studentId}:`, error);
            }
          }
        }
      } else {
        setDetectedCount(0);
      }
    } catch (error) {
      // Detection endpoint might not be available, ignore
    }
  }, [cameraActive, autoDetection, detectionThreshold, classId, fetchStudents]);

  // Handle manual attendance toggle
  const handleManualAttendance = async (studentId: string, markPresent: boolean) => {
    setProcessingStudent(studentId);

    // Manual attendance: present = 105, absent = -1
    const confidence = markPresent ? 105 : -1;

    try {
      await attendanceService.recordAttendance(
        parseInt(classId),
        studentId,
        confidence
      );

      // Update tracking set
      if (markPresent) {
        attendedStudentsRef.current.add(studentId);
      } else {
        attendedStudentsRef.current.delete(studentId);
      }

      // Fetch fresh data from API
      await fetchStudents();
    } catch (err) {
      console.error(`Failed to set manual attendance for ${studentId}:`, err);
      alert('Failed to update attendance. Please try again.');
    } finally {
      setProcessingStudent(null);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cameraContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Mark all students as present
  const markAllPresent = async () => {
    if (processingBulk) return;

    const absentStudents = students.filter(s => !s.isAttended);
    if (absentStudents.length === 0) {
      alert('All students are already marked as present.');
      return;
    }

    if (!confirm(`Are you sure you want to mark all ${absentStudents.length} absent students as PRESENT?\n\nThis will set confidence to 105 (Manual) for all absent students.`)) {
      return;
    }

    setProcessingBulk(true);

    try {
      for (const student of absentStudents) {
        await attendanceService.recordAttendance(
          parseInt(classId),
          student.userId,
          105 // Manual present
        );
        attendedStudentsRef.current.add(student.userId);
      }
      await fetchStudents();
    } catch (error) {
      console.error('Failed to mark all present:', error);
      alert('Failed to mark all students present.');
    } finally {
      setProcessingBulk(false);
    }
  };

  // Mark all students as absent (Reset)
  const markAllAbsent = async () => {
    if (processingBulk) return;

    const presentStudents = students.filter(s => s.isAttended);
    if (presentStudents.length === 0) {
      alert('All students are already marked as absent.');
      return;
    }

    if (!confirm(`⚠️ Are you sure you want to RESET attendance?\n\nThis will mark all ${presentStudents.length} present students as ABSENT (confidence: -1).\n\nThis action cannot be undone!`)) {
      return;
    }

    setProcessingBulk(true);

    try {
      for (const student of presentStudents) {
        await attendanceService.recordAttendance(
          parseInt(classId),
          student.userId,
          -1 // Manual absent
        );
        attendedStudentsRef.current.delete(student.userId);
      }
      await fetchStudents();
    } catch (error) {
      console.error('Failed to mark all absent:', error);
      alert('Failed to mark all students absent.');
    } finally {
      setProcessingBulk(false);
    }
  };

  // Reset all attendance (mark all as absent) - just calls markAllAbsent which has its own confirmation
  const resetAttendance = async () => {
    await markAllAbsent();
  };

  // PTZ Camera Control Functions
  const ptzMove = async (direction: string) => {
    if (!showPtzControls) return; // Only move if PTZ panel is open
    setIsPtzMoving(true);
    try {
      await fetch('http://localhost:5000/ptz/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, speed: ptzSpeed })
      });
    } catch {
      // PTZ endpoint may not be available, silently ignore
    }
  };

  const ptzStop = async () => {
    if (!isPtzMoving) return; // Only stop if we were moving
    setIsPtzMoving(false);
    try {
      await fetch('http://localhost:5000/ptz/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'stop' })
      });
    } catch {
      // PTZ endpoint may not be available, silently ignore
    }
  };

  const ptzHome = async () => {
    try {
      await fetch('http://localhost:5000/ptz/home', { method: 'POST' });
    } catch {
      // PTZ endpoint may not be available, silently ignore
    }
  };

  const startPatrol = async () => {
    try {
      const presets = patrolPresets.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      const response = await fetch('http://localhost:5000/ptz/patrol/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presets,
          dwell_time: patrolDwell,
          loop: true
        })
      });
      if (response.ok) {
        setPatrolActive(true);
      }
    } catch (err) {
      console.error('Failed to start patrol:', err);
    }
  };

  const stopPatrol = async () => {
    try {
      await fetch('http://localhost:5000/ptz/patrol/stop', { method: 'POST' });
      setPatrolActive(false);
    } catch (err) {
      console.error('Failed to stop patrol:', err);
    }
  };

  const checkPatrolStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/ptz/patrol/status');
      if (response.ok) {
        const data = await response.json();
        setPatrolActive(data.active);
      }
    } catch {
      // Silently ignore
    }
  };

  // Handle right-click drag for PTZ control
  const handlePtzDrag = (e: React.MouseEvent) => {
    if (!showPtzControls) return; // Only handle if PTZ panel is open
    if (e.buttons === 2) { // Right mouse button
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const deltaX = e.clientX - rect.left - centerX;
      const deltaY = e.clientY - rect.top - centerY;

      // Determine direction based on delta
      const threshold = 30;
      let direction = 'stop';

      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }
        // Diagonal movements
        if (Math.abs(deltaX) > threshold && Math.abs(deltaY) > threshold) {
          if (deltaX > 0 && deltaY < 0) direction = 'upright';
          else if (deltaX < 0 && deltaY < 0) direction = 'upleft';
          else if (deltaX > 0 && deltaY > 0) direction = 'downright';
          else if (deltaX < 0 && deltaY > 0) direction = 'downleft';
        }
      }

      if (direction !== 'stop' && !isPtzMoving) {
        ptzMove(direction);
      }
    }
  };

  useEffect(() => {
    fetchStudents();
    startCamera();

    // Start polling for detections every 2 seconds
    pollingIntervalRef.current = setInterval(pollDetections, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchStudents, pollDetections]);

  // Get student image URL
  const getStudentImageUrl = (userId: string) => {
    return `https://srs.wiut.uz/logo/${userId}.jpg`;
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopCamera();
              stopPatrol();
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
              router.back();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            Live Attendance Session
          </h1>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-mono">
            Class: {classId}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {attendedCount}/{students.length} Attended
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${cameraActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {cameraActive ? 'Camera Active' : 'Camera Stopped'}
          </div>
          <button
            onClick={fetchStudents}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Camera Feed */}
        <div ref={cameraContainerRef} className={`${isFullscreen ? 'w-full' : 'w-2/3'} bg-black relative flex items-center justify-center overflow-hidden`}>
          {cameraActive ? (
            <img
              ref={videoRef}
              src="http://localhost:5000/video_feed"
              alt="Live Feed"
              className={`w-full h-full object-contain transition-transform duration-200 ${zoomLevel > 1 ? 'cursor-grab' : 'cursor-crosshair'} ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
              }}
              onClick={(e) => {
                if (zoomLevel === 1) {
                  // Click to zoom in on specific point
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setZoomOrigin({ x, y });
                  setPanOffset({ x: 0, y: 0 });
                  setZoomLevel(2);
                }
              }}
              onDoubleClick={() => {
                // Double-click to reset zoom
                setZoomLevel(1);
                setZoomOrigin({ x: 50, y: 50 });
                setPanOffset({ x: 0, y: 0 });
              }}
              onMouseDown={(e) => {
                if (zoomLevel > 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && zoomLevel > 1) {
                  const maxPan = (zoomLevel - 1) * 100;
                  const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x));
                  const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y));
                  setPanOffset({ x: newX, y: newY });
                }
                // Handle PTZ drag on right-click
                handlePtzDrag(e);
              }}
              onMouseUp={() => {
                setIsDragging(false);
                if (isPtzMoving) ptzStop();
              }}
              onMouseLeave={() => {
                setIsDragging(false);
                if (isPtzMoving) ptzStop();
              }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-xl mb-4">Camera Paused</p>
              <button
                onClick={startCamera}
                className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Resume Camera
              </button>
            </div>
          )}

          {/* Overlay Statistics */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white p-4 rounded-lg">
            <div className="text-sm font-medium opacity-80">Faces Detected</div>
            <div className="text-2xl font-bold">{detectedCount}</div>
          </div>

          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-4 rounded-lg">
            <div className="text-sm font-medium opacity-80">Attended</div>
            <div className="text-2xl font-bold text-green-400">{attendedCount}</div>
          </div>

          {/* Auto-Detection Toggle */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-lg flex items-center gap-3">
            <button
              onClick={() => setAutoDetection(!autoDetection)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${autoDetection
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300'
                }`}
            >
              {autoDetection ? <Scan className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
              {autoDetection ? 'Auto-Detect ON' : 'Auto-Detect OFF'}
            </button>
            <span className="text-xs opacity-70">Threshold: {detectionThreshold}%</span>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute top-20 right-4 bg-black/80 backdrop-blur-md text-white p-4 rounded-lg w-64">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm opacity-80 block mb-1">Detection Threshold: {detectionThreshold}%</label>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={detectionThreshold}
                    onChange={(e) => setDetectionThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="text-xs opacity-60">
                  Higher threshold = stricter matching (fewer false positives)
                </div>
              </div>
            </div>
          )}

          {/* PTZ Camera Controls */}
          {showPtzControls && (
            <div className="absolute bottom-24 right-4 bg-black/80 backdrop-blur-md text-white p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
                <Gamepad2 className="w-4 h-4" /> Camera PTZ Control
              </h3>

              {/* Direction Pad */}
              <div className="grid grid-cols-3 gap-1 w-32 mx-auto mb-3">
                {/* Top Row */}
                <div />
                <button
                  onMouseDown={() => ptzMove('up')}
                  onMouseUp={ptzStop}
                  onMouseLeave={ptzStop}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  title="Tilt Up"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <div />

                {/* Middle Row */}
                <button
                  onMouseDown={() => ptzMove('left')}
                  onMouseUp={ptzStop}
                  onMouseLeave={ptzStop}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  title="Pan Left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={ptzHome}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center"
                  title="Home Position"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={() => ptzMove('right')}
                  onMouseUp={ptzStop}
                  onMouseLeave={ptzStop}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  title="Pan Right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Bottom Row */}
                <div />
                <button
                  onMouseDown={() => ptzMove('down')}
                  onMouseUp={ptzStop}
                  onMouseLeave={ptzStop}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                  title="Tilt Down"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div />
              </div>

              {/* Speed Control */}
              <div className="mt-3">
                <label className="text-xs opacity-70 block mb-1">Speed: {ptzSpeed}</label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={ptzSpeed}
                  onChange={(e) => setPtzSpeed(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Hint */}
              <div className="mt-3 text-xs opacity-60 text-center">
                💡 Right-click + drag on video to move camera
              </div>

              {/* Patrol Controls */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <h4 className="text-xs font-medium mb-2">Auto Patrol Scan</h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs opacity-70 block mb-1">Presets (comma-separated)</label>
                    <input
                      type="text"
                      value={patrolPresets}
                      onChange={(e) => setPatrolPresets(e.target.value)}
                      placeholder="1,2,3"
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs"
                      disabled={patrolActive}
                    />
                  </div>

                  <div>
                    <label className="text-xs opacity-70 block mb-1">Dwell Time: {patrolDwell}s</label>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      value={patrolDwell}
                      onChange={(e) => setPatrolDwell(parseInt(e.target.value))}
                      className="w-full"
                      disabled={patrolActive}
                    />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={startPatrol}
                      disabled={patrolActive}
                      className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${patrolActive
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                    >
                      {patrolActive ? 'Scanning...' : 'Start'}
                    </button>
                    <button
                      onClick={stopPatrol}
                      disabled={!patrolActive}
                      className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${!patrolActive
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                    >
                      Stop
                    </button>
                  </div>

                  {patrolActive && (
                    <div className="text-xs text-green-400 text-center mt-2 animate-pulse">
                      🔄 Patrol scanning active
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Camera Control Buttons */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4">
            {/* Start/Resume Button */}
            <button
              onClick={startCamera}
              disabled={cameraActive}
              className={`p-3 rounded-full transition-all ${cameraActive
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              title="Start Camera"
            >
              <Play className="w-5 h-5" />
            </button>

            {/* Pause Button */}
            <button
              onClick={stopCamera}
              disabled={!cameraActive}
              className={`p-3 rounded-full transition-all ${!cameraActive
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              title="Pause Camera"
            >
              <Pause className="w-5 h-5" />
            </button>

            {/* Stop & End Session Button */}
            <button
              onClick={() => {
                stopCamera();
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                }
                router.back();
              }}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all"
              title="End Session"
            >
              <Square className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-white/30" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-full px-2">
              <button
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))}
                disabled={zoomLevel <= 1}
                className={`p-2 rounded-full transition-all ${zoomLevel <= 1
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-gray-600'
                  }`}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-white text-xs font-medium min-w-[40px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                disabled={zoomLevel >= 3}
                className={`p-2 rounded-full transition-all ${zoomLevel >= 3
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-gray-600'
                  }`}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setZoomOrigin({ x: 50, y: 50 });
                  setPanOffset({ x: 0, y: 0 });
                }}
                disabled={zoomLevel === 1}
                className={`p-2 rounded-full transition-all ${zoomLevel === 1
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-gray-600'
                  }`}
                title="Reset Zoom"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Hint */}
            {zoomLevel === 1 && (
              <div className="text-gray-400 text-xs flex items-center gap-1">
                <Target className="w-3 h-3" />
                Click to zoom
              </div>
            )}
            {zoomLevel > 1 && (
              <div className="text-gray-400 text-xs flex items-center gap-1">
                <Move className="w-3 h-3" />
                Drag to pan
              </div>
            )}

            <div className="w-px h-8 bg-white/30" />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-all ${showSettings
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* PTZ Controls Toggle */}
            <button
              onClick={() => setShowPtzControls(!showPtzControls)}
              className={`p-3 rounded-full transition-all ${showPtzControls
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              title="PTZ Camera Control"
            >
              <Gamepad2 className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-white/30" />

            {/* Camera Status Indicator */}
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <Video className="w-5 h-5 text-green-400" />
              ) : (
                <VideoOff className="w-5 h-5 text-red-400" />
              )}
              <span className="text-white text-sm font-medium">
                {cameraActive ? 'Recording' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Student List */}
        <div className={`${isFullscreen ? 'hidden' : 'w-1/3'} bg-white border-l border-gray-200 flex flex-col`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student List
              </h2>
              <span className="bg-gray-200 px-2 rounded text-sm text-gray-600">{students.length}</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'all'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                All ({students.length})
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'present'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Present ({students.filter(s => s.isAttended).length})
              </button>
              <button
                onClick={() => setFilterStatus('absent')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'absent'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Absent ({students.filter(s => !s.isAttended).length})
              </button>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={markAllPresent}
                disabled={processingBulk}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {processingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                All Present
              </button>
              <button
                onClick={resetAttendance}
                disabled={processingBulk}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {processingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No students found for this class.</div>
            ) : (
              students
                .filter(student => {
                  // Apply search filter
                  const matchesSearch = searchQuery === '' ||
                    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.userId.toLowerCase().includes(searchQuery.toLowerCase());

                  // Apply status filter
                  const matchesStatus = filterStatus === 'all' ||
                    (filterStatus === 'present' && student.isAttended) ||
                    (filterStatus === 'absent' && !student.isAttended);

                  return matchesSearch && matchesStatus;
                })
                .map((student) => (
                  <div
                    key={student.userId}
                    className={`flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition-all ${student.isAttended
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-100'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Student Photo */}
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                        <img
                          src={getStudentImageUrl(student.userId)}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to initials on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="text-sm">${student.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}</span>`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.fullName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{student.userId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Confidence Badge */}
                      {student.confidence !== 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${student.confidence === 105
                          ? 'bg-blue-100 text-blue-700'
                          : student.confidence === -1
                            ? 'bg-red-100 text-red-700'
                            : student.confidence >= 70
                              ? 'bg-green-100 text-green-700'
                              : student.confidence >= 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                          {student.confidence === 105
                            ? 'Manual'
                            : student.confidence === -1
                              ? 'Excused'
                              : `${student.confidence}%`}
                        </span>
                      )}

                      {/* Manual Attendance Buttons */}
                      {processingStudent === student.userId ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleManualAttendance(student.userId, true)}
                            disabled={processingStudent !== null}
                            className={`p-1.5 rounded-full transition-colors ${student.isAttended && student.confidence === 105
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-green-100 text-gray-400 hover:text-green-600'
                              }`}
                            title="Mark Present (Manual)"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleManualAttendance(student.userId, false)}
                            disabled={processingStudent !== null}
                            className={`p-1.5 rounded-full transition-colors ${!student.isAttended && student.confidence === -1
                              ? 'bg-red-500 text-white'
                              : 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                              }`}
                            title="Mark Absent (Manual)"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${student.isAttended
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                        }`}>
                        {student.isAttended ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
