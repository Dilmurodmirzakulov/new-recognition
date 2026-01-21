'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { attendanceAPI } from '@/lib/api';

interface AttendanceRecord {
  student_id: string;
  name: string;
  confidence: number;
  recorded_at: string;
}

interface Session {
  session_id: string;
  class: string;
  subject: string;
  status: string;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [className, setClassName] = useState('10-A');
  const [subject, setSubject] = useState('Mathematics');
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Start session
  const handleStartSession = async () => {
    try {
      setLoading(true);
      const result = await attendanceAPI.startSession(className, subject, 'teacher-001');
      setSession(result);
      setAttendance([]);
      setIsDetecting(true);
      
      // Auto-detect every 5 seconds (reduced frequency for performance)
      const interval = setInterval(async () => {
        await detectFaces(result.session_id);
      }, 5000);
      
      // Store interval ID
      (window as any).detectionInterval = interval;
    } catch (err) {
      console.error('Error starting session:', err);
      alert('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Detect faces
  const detectFaces = async (sessionId: string) => {
    try {
      const result = await attendanceAPI.detectFaces(sessionId);
      
      if (result.students && result.students.length > 0) {
        // Add new students to list
        setAttendance(prev => {
          const ids = new Set(prev.map(a => a.student_id));
          const newStudents = result.students.filter(
            (s: AttendanceRecord) => !ids.has(s.student_id)
          );
          return [...prev, ...newStudents];
        });
      }
    } catch (err) {
      console.error('Error detecting faces:', err);
    }
  };

  // End session
  const handleEndSession = async () => {
    if (!session) return;

    try {
      setLoading(true);
      
      // Clear auto-detection
      if ((window as any).detectionInterval) {
        clearInterval((window as any).detectionInterval);
      }
      
      await attendanceAPI.endSession(session.session_id);
      setSession(null);
      setIsDetecting(false);
    } catch (err) {
      console.error('Error ending session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            📚 Classroom Attendance System
          </h1>
          <div className="flex gap-3">
            <Link
              href="/live"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📹 Live Feed
            </Link>
            <Link
              href="/students"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              👥 Students
            </Link>
          </div>
        </div>

        {!session ? (
          // Start Session Form
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Start Attendance Session</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., 10-A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {loading ? 'Starting...' : '▶️ Start Session'}
            </button>
          </div>
        ) : (
          // Active Session
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Active Session: {session.class}
                </h2>
                <p className="text-gray-600">Subject: {subject}</p>
              </div>
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                {loading ? 'Ending...' : '⏹️ End Session'}
              </button>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-700 mb-4">
                🎥 Camera is live - detecting student faces in real-time
              </p>
              {/* Live Camera Feed */}
              <div className="bg-black rounded-lg overflow-hidden">
                <img 
                  src="http://localhost:5000/video_feed" 
                  alt="Live Camera Feed"
                  className="w-full h-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Attendance List */}
        {attendance.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              ✅ Attendance ({attendance.length} students)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left font-bold text-gray-700">#</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Student ID</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Confidence</th>
                    <th className="px-4 py-2 text-left font-bold text-gray-700">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono">{record.student_id}</td>
                      <td className="px-4 py-2">{record.name}</td>
                      <td className="px-4 py-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          {(record.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(record.recorded_at || Date.now()).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
