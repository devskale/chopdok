// lib/db.ts
import path from "path";

let db: any;
const ensureDb = async () => {
  if (db) return true;
  try {
    const mod = await import("better-sqlite3");
    const Database = mod.default || mod;
    db = new Database(path.join(process.cwd(), "directories.db"));
    return true;
  } catch {
    return false;
  }
};

// Create the directories table if it doesn't exist
if (db) db.exec(`
  CREATE TABLE IF NOT EXISTS directories (
    path TEXT PRIMARY KEY,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create the summaries table if it doesn't exist
if (db) db.exec(`
  CREATE TABLE IF NOT EXISTS summaries (
    file_path TEXT PRIMARY KEY,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create the proposed_names table if it doesn't exist
if (db) db.exec(`
  CREATE TABLE IF NOT EXISTS proposed_names (
    file_path TEXT PRIMARY KEY,
    proposed_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function recordDirectory(dirPath: string): void {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO directories (path) VALUES (?)"
  );
  stmt.run(dirPath);
}

export function getFirstSeen(dirPath: string): string | null {
  if (!db) return null;
  const stmt = db.prepare("SELECT first_seen FROM directories WHERE path = ?");
  const result = stmt.get(dirPath) as { first_seen: string } | undefined;
  return result ? result.first_seen : null;
}

export function insertOrUpdateSummary(filePath: string, summary: string): void {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO summaries (file_path, summary) VALUES (?, ?)"
  );
  stmt.run(filePath, summary);
}

export async function getSummary(filePath: string): Promise<string | null> {
  if (!db) return null;
  const stmt = await db.prepare(
    "SELECT summary FROM summaries WHERE file_path = ?"
  );
  const result = (await stmt.get(filePath)) as { summary: string } | undefined;
  return result ? result.summary : null;
}

export function getProposedName(filePath: string): string | null {
  if (!db) return null;
  try {
    const stmt = db.prepare(
      "SELECT proposed_name FROM proposed_names WHERE file_path = ?"
    );
    const result = stmt.get(filePath) as { proposed_name: string } | undefined;
    return result ? result.proposed_name : null;
  } catch (error) {
    console.error("Error in getProposedName:", error);
    return null;
  }
}

export function insertOrUpdateProposedName(
  filePath: string,
  proposedName: string
): void {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO proposed_names (file_path, proposed_name) VALUES (?, ?)"
  );
  stmt.run(filePath, proposedName);
}

export { db };