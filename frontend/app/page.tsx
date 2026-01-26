import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex flex-col items-center justify-center p-4 text-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-6 tracking-tight">
          WIUT Attendance System
        </h1>
        <p className="text-xl text-blue-100 mb-10 leading-relaxed">
          Automated face recognition attendance tracking for smart classrooms.
          Seamless, fast, and reliable.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-blue-900/50"
        >
          Login to System
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      <div className="absolute bottom-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Westminster International University in Tashkent
      </div>
    </div>
  );
}
