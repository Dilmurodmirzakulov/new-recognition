import pool from '../utils/database';

export interface Session {
  id: string;
  class: string;
  subject: string;
  teacher_id: string;
  started_at: Date;
  ended_at: Date | null;
  status: 'active' | 'ended';
}

export class SessionModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        teacher_id VARCHAR(100),
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(query);
  }

  static async create(className: string, subject: string, teacher_id: string) {
    const query = `
      INSERT INTO sessions (class, subject, teacher_id, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `;
    const result = await pool.query(query, [className, subject, teacher_id]);
    return result.rows[0];
  }

  static async getActiveSession(className: string) {
    const query = `
      SELECT * FROM sessions
      WHERE class = $1 AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [className]);
    return result.rows[0];
  }

  static async endSession(sessionId: string) {
    const query = `
      UPDATE sessions
      SET status = 'ended', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }

  static async getById(id: string) {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}
