import express from 'express';
import axios from 'axios';
import { SessionModel } from '../models/Session';
import { AttendanceModel } from '../models/Attendance';
import { StudentModel } from '../models/Student';

const router = express.Router();

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// Start attendance session
router.post('/sessions/start', async (req, res) => {
  try {
    const { className, subject, teacher_id } = req.body;

    if (!className || !teacher_id) {
      return res.status(400).json({ error: 'Missing className or teacher_id' });
    }

    // Create session
    const session = await SessionModel.create(className, subject || '', teacher_id);

    // Start Python face detection
    try {
      await axios.post(`${PYTHON_SERVICE_URL}/start`);
    } catch (err) {
      console.warn('⚠️ Could not start Python service, but continuing...');
    }

    res.json({
      status: 'started',
      session_id: session.id,
      class: session.class,
      started_at: session.started_at
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// End attendance session
router.post('/sessions/:session_id/end', async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await SessionModel.endSession(session_id);

    // Stop Python face detection
    try {
      await axios.post(`${PYTHON_SERVICE_URL}/stop`);
    } catch (err) {
      console.warn('⚠️ Could not stop Python service');
    }

    res.json({
      status: 'ended',
      session_id: session.id,
      ended_at: session.ended_at
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get detected faces from Python service and log attendance
router.post('/detect', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // Get detected faces from Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/detect`);
    const { results } = response.data;

    // Log each detected student
    const logged = [];
    for (const result of results) {
      if (result.student_id) {
        const attendance = await AttendanceModel.recordAttendance(
          session_id,
          result.student_id,
          result.confidence
        );
        if (attendance) {
          logged.push({
            student_id: result.student_id,
            name: result.name,
            confidence: result.confidence,
            recorded_at: attendance.recorded_at
          });
        }
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      session_id,
      students_detected: logged.length,
      students: logged
    });
  } catch (err) {
    console.error('❌ Error in /detect:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get session attendance
router.get('/sessions/:session_id/attendance', async (req, res) => {
  try {
    const { session_id } = req.params;
    const attendance = await AttendanceModel.getSessionAttendance(session_id);
    res.json({ session_id, attendance });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
