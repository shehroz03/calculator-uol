const { Pool } = require('pg');
require('dotenv').config();

// We must require SSL for Supabase Postgres connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create table if not exists
const initDB = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_results (
      id SERIAL PRIMARY KEY,
      userid VARCHAR(255) UNIQUE NOT NULL,
      currentgpa VARCHAR(50),
      totalcreditsdone VARCHAR(50),
      semesters JSONB,
      updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('✅ PostgreSQL Table ready');
  } catch (err) {
    console.error('❌ PostgreSQL Init Error:', err);
  }
};

initDB();

module.exports = pool;
