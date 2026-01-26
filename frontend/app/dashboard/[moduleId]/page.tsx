'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceService, pythonService } from '@/lib/api';
import { Calendar, Clock, ArrowLeft, Loader2, Users, Download, AlertCircle } from 'lucide-react';

interface Slot {
  dayOfWeek: string;
  user: string;
  time: string;
  guidID: string;
}

interface AttClass {
  classId: number;
  teachingWeek: string;
  teachingType: string;
}

export default function ModuleDetails({ params }: { params: Promise<{ moduleId: string }> }) {
  // Unwrap params using React.use()
  const { moduleId } = use(params);

  const [loading, setLoading] = useState(false);
  const [teachingType, setTeachingType] = useState<number>(1);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [attClasses, setAttClasses] = useState<AttClass[]>([]);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  // Embedding state
  const [checkingEmbeddings, setCheckingEmbeddings] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [embeddingProgress, setEmbeddingProgress] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<string>("");

  const router = useRouter();

  useEffect(() => {
    fetchLessons();
  }, [moduleId, teachingType]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getSlots(parseInt(moduleId), teachingType);
      setSlots(data.slots || []);
      setAttClasses(data.attClasses || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedSlot || !selectedClass) return;

    setCheckingEmbeddings(true);
    try {
      // 1. Fetch students for this class
      const students = await attendanceService.getStudents(selectedSlot, selectedClass);
      setStudentsData(students);

      if (!students || students.length === 0) {
        // No students, just proceed? Or show error? Proceeding.
        router.push(`/session/${selectedSlot}/${selectedClass}`);
        return;
      }

      // Map student IDs - handle different possible field names from API
      const studentIds = students.map((s: any) => {
        const id = s.studentId || s.userId || s.id || s.StudentId || s.UserId;
        return String(id);
      }).filter(id => id && id !== 'undefined');

      // 2. Check with Python service
      const checkResult = await pythonService.checkStudents(studentIds);

      if (checkResult.missing && checkResult.missing.length > 0) {
        setMissingIds(checkResult.missing);
        setShowEmbedModal(true);
      } else {
        // All good, start
        router.push(`/session/${selectedSlot}/${selectedClass}`);
      }

    } catch (error) {
      console.error("Error checking embeddings:", error);
      alert("Failed to check student embeddings. Starting session anyway.");
      router.push(`/session/${selectedSlot}/${selectedClass}`);
    } finally {
      setCheckingEmbeddings(false);
    }
  };

  const handleEmbedAll = async () => {
    setEmbeddingProgress(true);
    setEmbedStatus(`Embedding ${missingIds.length} students...`);

    try {
      // Debug: Log the data
      console.log("Missing IDs:", missingIds);
      console.log("Students Data:", studentsData);

      // Filter students that need embedding - compare as strings
      // Handle various possible field names from API
      const studentsToEmbed = studentsData.filter(s => {
        const sid = String(s.studentId || s.userId || s.id || s.StudentId || s.UserId || '');
        return missingIds.includes(sid);
      });

      console.log("Students to embed:", studentsToEmbed);

      // Transform to expected format for Python service
      let payload = studentsToEmbed.map(s => ({
        studentId: String(s.studentId || s.userId || s.id || s.StudentId || s.UserId),
        fullName: s.fullName || s.FullName || `${s.firstName || s.FirstName || ''} ${s.lastName || s.LastName || ''}`.trim() || s.name || 'Unknown'
      }));

      // If filter didn't work, create payload from missing IDs
      if (payload.length === 0 && missingIds.length > 0) {
        console.log("Fallback: Creating payload from missing IDs");
        payload = missingIds.map(id => {
          const student = studentsData.find(s => {
            const sid = String(s.studentId || s.userId || s.id || s.StudentId || s.UserId || '');
            return sid === id;
          });
          if (student) {
            return {
              studentId: id,
              fullName: student.fullName || student.FullName || `${student.firstName || student.FirstName || ''} ${student.lastName || student.LastName || ''}`.trim() || 'Unknown'
            };
          }
          return { studentId: id, fullName: 'Unknown' };
        });
      }

      console.log("Final payload for embedding:", payload);

      const result = await pythonService.embedStudents(payload);

      setEmbedStatus(`Done! Success: ${result.success.length}, Failed: ${result.failed.length}`);

      // Short delay usually good for UX
      setTimeout(() => {
        router.push(`/session/${selectedSlot!}/${selectedClass!}`);
      }, 1500);

    } catch (error) {
      console.error("Embedding error:", error);
      setEmbedStatus("Error during embedding.");
    } finally {
      setEmbeddingProgress(false); // keep modal open to show status
    }
  };

  const skipEmbedding = () => {
    router.push(`/session/${selectedSlot!}/${selectedClass!}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      {/* Modal Overlay */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-amber-500" />
              Missing Student Embeddings
            </h3>

            <p className="text-gray-600 mb-6">
              Found {missingIds.length} students without face recognition data.
              Would you like to download and embed their photos now?
            </p>

            {embedStatus && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                {embedStatus}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={skipEmbedding}
                disabled={embeddingProgress}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Skip & Start
              </button>

              <button
                onClick={handleEmbedAll}
                disabled={embeddingProgress}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {embeddingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Embed All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Modules
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Select Session Details</h1>

          {/* Teaching Type Selection */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setTeachingType(1)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${teachingType === 1
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Seminar
            </button>
            <button
              onClick={() => setTeachingType(2)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${teachingType === 2
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Workshop
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Slots Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  Select Time Slot
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {slots.map((slot) => (
                    <div
                      key={slot.guidID}
                      onClick={() => setSelectedSlot(slot.guidID)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSlot === slot.guidID
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      <div className="font-medium text-gray-900">{slot.dayOfWeek}</div>
                      <div className="text-gray-500">{slot.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teaching Week Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-500" />
                  Select Teaching Week
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {attClasses.map((cls) => (
                    <div
                      key={cls.classId}
                      onClick={() => setSelectedClass(cls.classId)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all text-center ${selectedClass === cls.classId
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:border-green-300'
                        }`}
                    >
                      <div className="font-bold text-gray-900">{cls.teachingWeek}</div>
                      <div className="text-xs text-gray-500 mt-1">{cls.teachingType}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartSession}
          disabled={!selectedSlot || !selectedClass || checkingEmbeddings}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {checkingEmbeddings ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Checking Student Data...
            </>
          ) : (
            <>
              <Users className="w-6 h-6" />
              Start Attendance Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
