import pool from '../utils/database';

export interface Student {
  id: string;
  name: string;
  student_id: string;
  class: string;
  face_encoding_id: string;
  photo_path?: string;
  created_at: Date;
}

export class StudentModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        class VARCHAR(50),
        face_encoding_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(query);
  }

  static async create(student_id: string, name: string, className: string, face_encoding_id: string) {
    const query = `
      INSERT INTO students (student_id, name, class, face_encoding_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [student_id, name, className, face_encoding_id]);
    return result.rows[0];
  }

  static async getById(id: string) {
    const query = 'SELECT * FROM students WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getByStudentId(student_id: string) {
    const query = 'SELECT * FROM students WHERE student_id = $1';
    const result = await pool.query(query, [student_id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM students ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: string, name: string, className: string) {
    const query = `
      UPDATE students
      SET name = $1, class = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, className, id]);
    return result.rows[0];
  }

  static async delete(id: string) {
    const query = 'DELETE FROM students WHERE id = $1';
    await pool.query(query, [id]);
  }
}
