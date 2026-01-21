'use client';

import Link from 'next/link';

export default function LiveFeedPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            📹 Live Camera Feed
          </h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Real-time Face Recognition
            </h2>
            <p className="text-gray-600">
              Live camera feed with face detection and recognition. Green boxes indicate recognized students with confidence percentage.
            </p>
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden">
            <img
              src="http://localhost:5000/video_feed"
              alt="Live Camera Feed"
              className="w-full h-auto"
              style={{ maxHeight: '70vh' }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Recognized Student</span>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Unknown Person</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Confidence:</strong> Shows recognition accuracy (0-100%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
