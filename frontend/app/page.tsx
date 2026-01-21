import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          🎓 Yuksalish Attendance
        </h1>
        <p className="text-xl text-blue-100 mb-8">
          Real-time Classroom Face Recognition System
        </p>

        <Link href="/dashboard">
          <button className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition text-lg">
            📊 Go to Dashboard →
          </button>
        </Link>

        <div className="mt-12 text-white text-left inline-block">
          <h2 className="text-2xl font-bold mb-4">Features:</h2>
          <ul className="space-y-2 text-lg">
            <li>✅ Real-time face detection and recognition</li>
            <li>✅ Automatic attendance logging</li>
            <li>✅ Multiple students simultaneously</li>
            <li>✅ Confidence score tracking</li>
            <li>✅ Session management</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
