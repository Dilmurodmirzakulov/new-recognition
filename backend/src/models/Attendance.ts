import pool from '../utils/database';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  confidence: number;
  status: 'present' | 'absent';
  recorded_at: Date;
}

export class AttendanceModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        student_id VARCHAR(50) NOT NULL,
        confidence FLOAT DEFAULT 0.0,
        status VARCHAR(20) DEFAULT 'present',
        recorded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id, student_id)
      )
    `;
    await pool.query(query);
  }

  static async recordAttendance(
    sessionId: string,
    studentId: string,
    confidence: number
  ) {
    const query = `
      INSERT INTO attendance (session_id, student_id, confidence, status)
      VALUES ($1, $2, $3, 'present')
      ON CONFLICT (session_id, student_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [sessionId, studentId, confidence]);
    return result.rows[0];
  }

  static async getSessionAttendance(sessionId: string) {
    const query = `
      SELECT a.*, s.name as student_name
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.student_id
      WHERE a.session_id = $1
      ORDER BY a.recorded_at DESC
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows;
  }

  static async getStudentAttendance(studentId: string, limit: number = 30) {
    const query = `
      SELECT a.*, s.class, sessions.subject
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.student_id
      LEFT JOIN sessions ON a.session_id = sessions.id
      WHERE a.student_id = $1
      ORDER BY a.recorded_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [studentId, limit]);
    return result.rows;
  }
}
