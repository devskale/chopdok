// lib/projectsDb.ts
import path from "path";
import fs from "fs";
import { Project, Ausschreibung, Angebot, ProjectStatus } from "./types";

let db: any;

const ensureDatabase = async () => {
  if (db) return true;
  try {
    const dbPath = path.join(process.cwd(), "projects.db");
    await fs.promises.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    const mod = await import("better-sqlite3");
    const Database = mod.default || mod;
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        prjid TEXT PRIMARY KEY,
        name TEXT,
        status TEXT DEFAULT 'ACTIVE'
      );

      CREATE TABLE IF NOT EXISTS ausschreibungen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prjid TEXT,
        version TEXT,
        lot_number TEXT,
        path TEXT,
        FOREIGN KEY (prjid) REFERENCES projects (prjid)
      );

      CREATE TABLE IF NOT EXISTS angebote (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prjid TEXT,
        version TEXT,
        lot_number TEXT,
        company TEXT,
        path TEXT,
        FOREIGN KEY (prjid) REFERENCES projects (prjid)
      );
    `);
    return true;
  } catch (error) {
    return false;
  }
};

// Database functions below will check if db is initialized before use

export function getProjects(
  status: ProjectStatus = ProjectStatus.ACTIVE
): Project[] {
  try {
    if (!db) {
      console.error("Database not initialized");
      return [];
    }

    console.log(
      `Executing query: SELECT * FROM projects WHERE status = '${status}'`
    );
    const stmt = db.prepare("SELECT * FROM projects WHERE status = ?");
    const results = stmt.all(status);
    console.log(`Query executed successfully. Results:`, results);

    if (!Array.isArray(results)) {
      console.warn("Query result is not an array. Returning empty array.");
      return [];
    }

    return results as Project[];
  } catch (error) {
    console.error("Error in getProjects:", error);
    return []; // Return empty array on error
  }
}

export function getAusschreibungen(projectId?: string): Ausschreibung[] {
  try {
    if (!db) {
      console.error("Database not initialized");
      return [];
    }

    if (projectId) {
      return db
        .prepare("SELECT * FROM ausschreibungen WHERE prjid = ?")
        .all(projectId) as Ausschreibung[];
    }
    return db.prepare("SELECT * FROM ausschreibungen").all() as Ausschreibung[];
  } catch (error) {
    console.error("Error in getAusschreibungen:", error);
    return []; // Return empty array on error
  }
}

export function getAngebote(projectId?: string): Angebot[] {
  try {
    if (!db) {
      console.error("Database not initialized");
      return [];
    }

    if (projectId) {
      return db
        .prepare("SELECT * FROM angebote WHERE prjid = ?")
        .all(projectId) as Angebot[];
    }
    return db.prepare("SELECT * FROM angebote").all() as Angebot[];
  } catch (error) {
    console.error("Error in getAngebote:", error);
    return []; // Return empty array on error
  }
}

export function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus
): void {
  try {
    if (!db) {
      console.error("Database not initialized");
      return;
    }

    db.prepare("UPDATE projects SET status = ? WHERE prjid = ?").run(
      newStatus,
      projectId
    );
  } catch (error) {
    console.error("Error in updateProjectStatus:", error);
  }
}

export function getProjectById(projectId: string): Project | undefined {
  try {
    if (!db) {
      console.error("Database not initialized");
      return undefined;
    }

    return db
      .prepare("SELECT * FROM projects WHERE prjid = ?")
      .get(projectId) as Project | undefined;
  } catch (error) {
    console.error("Error in getProjectById:", error);
    return undefined;
  }
}

export function getAllProjectStatuses(): { [key: string]: number } {
  try {
    if (!db) {
      console.error("Database not initialized");
      return {};
    }

    const statuses = db
      .prepare("SELECT status, COUNT(*) as count FROM projects GROUP BY status")
      .all() as { status: string; count: number }[];
    return statuses.reduce(
      (acc, { status, count }) => ({ ...acc, [status]: count }),
      {}
    );
  } catch (error) {
    console.error("Error in getAllProjectStatuses:", error);
    return {};
  }
}
