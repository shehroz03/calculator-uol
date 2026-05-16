import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Ch3214261477%26%26%26@52.74.252.201:5432/postgres";

const client = new Client({
  connectionString: connectionString,
});

async function test() {
  try {
    console.log("Connecting to Supabase...");
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT NOW()');
    console.log("Query result:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection error:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    if (err.hint) console.error("Hint:", err.hint);
  }
}

test();
