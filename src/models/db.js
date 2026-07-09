const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'crm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initDatabase() {
  let retries = 15;
  let client;
  while (retries > 0) {
    try {
      client = await pool.connect();
      console.log('Successfully connected to the database.');
      break;
    } catch (err) {
      retries -= 1;
      console.log(`Database connection failed. Retrying in 2 seconds... (${retries} retries left)`);
      if (retries === 0) {
        console.error('Could not connect to the database. Exiting.');
        throw err;
      }
      await sleep(2000);
    }
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Database schema checked and loaded successfully.');
  } catch (err) {
    console.error('Failed to run schema migrations:', err);
    throw err;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
};
