// lib/databaseUtils.ts
import path from 'path';

let db: any;
const ensureDb = async () => {
  if (db) return true;
  try {
    const mod = await import('better-sqlite3');
    const Database = mod.default || mod;
    db = new Database(path.join(process.cwd(), 'directories.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS directories (
        path TEXT PRIMARY KEY,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch {
    return false;
  }
};

export function recordDirectory(dirPath: string): void {
  if (!db) return;
  const stmt = db.prepare('INSERT OR IGNORE INTO directories (path) VALUES (?)');
  stmt.run(dirPath);
}

export function getFirstSeen(dirPath: string): string | null {
  if (!db) return null;
  const stmt = db.prepare('SELECT first_seen FROM directories WHERE path = ?');
  const result = stmt.get(dirPath) as { first_seen: string } | undefined;
  return result ? result.first_seen : null;
}

export default db;
