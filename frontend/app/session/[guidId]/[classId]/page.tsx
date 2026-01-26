'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceService } from '@/lib/api';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, UserCheck, UserX, Loader2 } from 'lucide-react';

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

  // Track which students we've already sent attendance for (to avoid duplicates)
  const attendedStudentsRef = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!cameraActive) return;

    try {
      const response = await fetch('http://localhost:5000/detect', { method: 'POST' });
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setDetectedCount(data.results.length);

        // Process each detected face
        for (const result of data.results as DetectionResult[]) {
          const studentId = result.student_id;
          const confidence = result.confidence * 100; // Convert to percentage

          // If confidence > 50% and we haven't already recorded this student
          if (confidence > 50 && studentId && !attendedStudentsRef.current.has(studentId)) {
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
  }, [cameraActive, classId]);

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
        <div className="w-2/3 bg-black relative flex items-center justify-center">
          {cameraActive ? (
            <img
              src="http://localhost:5000/video_feed"
              alt="Live Feed"
              className="w-full h-full object-contain"
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
        </div>

        {/* Right: Student List */}
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 flex justify-between">
              <span>Student List</span>
              <span className="bg-gray-200 px-2 rounded text-sm text-gray-600">{students.length}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No students found for this class.</div>
            ) : (
              students.map((student) => (
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
