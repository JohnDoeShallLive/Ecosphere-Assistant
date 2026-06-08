const lancedb = require('@lancedb/lancedb');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(app.getPath('userData'), 'echo_lancedb');

let db = null;
let table = null;

async function initDB() {
  if (db) return { db, table };

  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  db = await lancedb.connect(DB_PATH);
  
  try {
    table = await db.openTable('memories');
  } catch (e) {
    // Table doesn't exist, create it with a dummy record to define schema
    // We'll use 384 dimensions for Xenova/all-MiniLM-L6-v2
    table = await db.createTable('memories', [
      {
        id: 'init',
        text: 'initialization',
        metadata: JSON.stringify({}),
        vector: new Float32Array(384).fill(0),
      },
    ]);
  }

  return { db, table };
}

async function addMemory(id, encryptedText, metadata, vector) {
  const { table } = await initDB();
  await table.add([
    {
      id,
      text: encryptedText,
      metadata: JSON.stringify(metadata),
      vector: new Float32Array(vector),
    },
  ]);
}

async function searchMemories(queryVector, limit = 5) {
  const { table } = await initDB();
  const results = await table
    .search(new Float32Array(queryVector))
    .limit(limit)
    .execute();
  
  return results.map(r => ({
    id: r.id,
    text: r.text,
    metadata: JSON.parse(r.metadata),
    score: r._distance,
  }));
}

async function getAllMemories() {
  const { table } = await initDB();
  const results = await table.toAzure?.() ?? await table.toArray(); // LanceDB version dependent
  // For older versions or standard arrays:
  const records = await table.query().execute();

  return records.map(r => ({
    id: r.id,
    text: r.text,
    metadata: JSON.parse(r.metadata),
  }));
}

module.exports = {
  initDB,
  addMemory,
  searchMemories,
  getAllMemories,
};
