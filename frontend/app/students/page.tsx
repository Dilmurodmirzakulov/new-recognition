'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  photo_path?: string;
  created_at: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: '', class: '' });
  const [saving, setSaving] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ student_id: '', name: '', class: '10-A' });
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/attendance/students');
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data.students || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, class: student.class });
  };

  const handleSave = async () => {
    if (!editingStudent) return;

    try {
      setSaving(true);
      const response = await fetch(`http://localhost:3001/api/attendance/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Failed to update student');

      // Update local state
      setStudents(students.map(s =>
        s.id === editingStudent.id
          ? { ...s, name: editForm.name, class: editForm.class }
          : s
      ));

      setEditingStudent(null);
    } catch (err) {
      alert('Failed to update student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingStudent(null);
    setEditForm({ name: '', class: '' });
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/attendance/students/${student.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete student');

      setStudents(students.filter(s => s.id !== student.id));
    } catch (err) {
      alert('Failed to delete student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const response = await fetch('http://localhost:3001/api/attendance/students/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: enrollForm.student_id,
          name: enrollForm.name,
          className: enrollForm.class
        })
      });

      if (!response.ok) throw new Error('Failed to enroll student');

      const data = await response.json();

      // Refresh students list
      await fetchStudents();

      setShowEnrollModal(false);
      setEnrollForm({ student_id: '', name: '', class: '10-A' });

      alert(`${enrollForm.name} enrolled successfully! Note: You need to add their photo to the face recognition system separately.`);
    } catch (err) {
      alert('Failed to enroll student: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading students...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            👥 Students List
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ➕ Enroll Student
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No students enrolled yet
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.photo_path ? (
                        <img
                          src={`http://localhost:3001/images/${student.photo_path}`}
                          alt={student.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23999"%3E' + student.student_id.slice(-2) + '%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {student.student_id.slice(-2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.class}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-gray-600">
          Total Students: <span className="font-semibold">{students.length}</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Edit Student
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID
                </label>
                <input
                  type="text"
                  value={editingStudent.student_id}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <input
                  type="text"
                  value={editForm.class}
                  onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.name || !editForm.class}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              ➕ Enroll New Student
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID *
                </label>
                <input
                  type="text"
                  value={enrollForm.student_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
                  placeholder="e.g., STU012"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class *
                </label>
                <input
                  type="text"
                  value={enrollForm.class}
                  onChange={(e) => setEnrollForm({ ...enrollForm, class: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> After enrolling, you must add the student's photo to the face recognition system using the enrollment script.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollForm({ student_id: '', name: '', class: '10-A' });
                }}
                disabled={enrolling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={enrolling || !enrollForm.student_id || !enrollForm.name || !enrollForm.class}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
