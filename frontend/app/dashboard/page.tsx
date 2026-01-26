'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceService } from '@/lib/api';
import { BookOpen, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Module {
  id: number;
  name: string;
  code: string;
}

export default function Dashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout, user } = useAuth();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await attendanceService.getMyModules();
      setModules(data);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-lg">My Modules</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                onClick={() => router.push(`/dashboard/${module.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {module.code}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
                  {module.name}
                </h3>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm text-gray-500">
                  <span>View Lessons</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
