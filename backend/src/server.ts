import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StudentModel } from './models/Student';
import { SessionModel } from './models/Session';
import { AttendanceModel } from './models/Attendance';
import attendanceRouter from './api/attendance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('📊 Initializing database tables...');
    await StudentModel.createTable();
    await SessionModel.createTable();
    await AttendanceModel.createTable();
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}

// Routes
app.use('/api/attendance', attendanceRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Attendance Backend' });
});

// Start server
async function start() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
