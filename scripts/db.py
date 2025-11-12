import sqlite3
import os
from dotenv import load_dotenv
from enum import Enum
import logging
from shared import ProjectType, Project, ProjectStatus

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "projects.db")

def create_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create projects table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        prjid TEXT PRIMARY KEY,
        name TEXT,
        status TEXT DEFAULT 'ACTIVE'              
    )
    ''')
    
    # Create ausschreibungen table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ausschreibungen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prjid TEXT,
        version TEXT,
        lot_number TEXT,
        company TEXT,
        path TEXT,
        FOREIGN KEY (prjid) REFERENCES projects (prjid)
    )
    ''')
    
    # Create angebote table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS angebote (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prjid TEXT,
        version TEXT,
        lot_number TEXT,
        company TEXT,
        path TEXT,
        FOREIGN KEY (prjid) REFERENCES projects (prjid)
    )
    ''')
    
    conn.commit()
    conn.close()

def insert_project(project: Project):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    logging.info(f"Inserting project: {project.id} - {project.name}")
    
    try:
        # Check if the project already exists
        cursor.execute('SELECT prjid FROM projects WHERE prjid = ?', (project.id,))
        existing_project = cursor.fetchone()
        
        if existing_project:
            logging.info(f"Project {project.id} already exists. Updating the existing record.")
            # Update the existing project
            cursor.execute('''
            UPDATE projects SET name = ?, status = ? WHERE prjid = ?
            ''', (project.name, project.status.value, project.id))
        else:
            logging.info(f"Project {project.id} does not exist. Inserting a new record.")
            # Insert a new project
            cursor.execute('''
            INSERT INTO projects (prjid, name, status) 
            VALUES (?, ?, ?)
            ''', (project.id, project.name, project.status.value))
        
        logging.info(f"Project type: {project.type}")
        
        # Insert or update Ausschreibung if present
        if project.type == ProjectType.AS:
            logging.info(f"Inserting Ausschreibung for project {project.id}")
            cursor.execute('''
            SELECT prjid FROM ausschreibungen WHERE prjid = ? AND version = ? AND lot_number = ? AND company = ?
            ''', (project.id, project.version, project.lot_number, project.company))
            existing_ausschreibung = cursor.fetchone()
            
            if existing_ausschreibung:
                logging.info(f"Ausschreibung for project {project.id} already exists. Updating the existing record.")
                cursor.execute('''
                UPDATE ausschreibungen SET path = ? WHERE prjid = ? AND version = ? AND lot_number = ? AND company = ?
                ''', (project.path, project.id, project.version, project.lot_number, project.company))
            else:
                logging.info(f"Ausschreibung for project {project.id} does not exist. Inserting a new record.")
                cursor.execute('''
                INSERT INTO ausschreibungen (prjid, version, lot_number, company, path)
                VALUES (?, ?, ?, ?, ?)
                ''', (project.id, project.version, project.lot_number, project.company, project.path))
            logging.info(f"Processed Ausschreibung: prjid={project.id}, version={project.version}, lot_number={project.lot_number}, company={project.company}, path={project.path}")
        
        # Insert or update Angebot if present
        elif project.type == ProjectType.AN:
            logging.info(f"Inserting Angebot for project {project.id}")
            cursor.execute('''
            SELECT prjid FROM angebote WHERE prjid = ? AND version = ? AND lot_number = ? AND company = ?
            ''', (project.id, project.version, project.lot_number, project.company))
            existing_angebot = cursor.fetchone()
            
            if existing_angebot:
                logging.info(f"Angebot for project {project.id} already exists. Updating the existing record.")
                cursor.execute('''
                UPDATE angebote SET path = ? WHERE prjid = ? AND version = ? AND lot_number = ? AND company = ?
                ''', (project.path, project.id, project.version, project.lot_number, project.company))
            else:
                logging.info(f"Angebot for project {project.id} does not exist. Inserting a new record.")
                cursor.execute('''
                INSERT INTO angebote (prjid, version, lot_number, company, path)
                VALUES (?, ?, ?, ?, ?)
                ''', (project.id, project.version, project.lot_number, project.company, project.path))
            logging.info(f"Processed Angebot: prjid={project.id}, version={project.version}, lot_number={project.lot_number}, company={project.company}, path={project.path}")
        
        conn.commit()
        logging.info(f"Successfully committed changes for project {project.id}")
    except Exception as e:
        logging.error(f"Error inserting project {project.id}: {str(e)}")
        conn.rollback()
    finally:
        conn.close()


def update_project_status(prjid: str, new_status: ProjectStatus):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        UPDATE projects SET status = ? WHERE prjid = ?
        ''', (new_status.value, prjid))
        conn.commit()
        logging.info(f"Successfully updated status for project {prjid} to {new_status}")
    except Exception as e:
        logging.error(f"Error updating status for project {prjid}: {str(e)}")
        conn.rollback()
    finally:
        conn.close()


def get_project(prjid):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM projects WHERE prjid = ?', (prjid,))
    project = cursor.fetchone()
    
    if project:
        cursor.execute('SELECT * FROM ausschreibungen WHERE prjid = ?', (prjid,))
        ausschreibungen = cursor.fetchall()
        
        cursor.execute('SELECT * FROM angebote WHERE prjid = ?', (prjid,))
        angebote = cursor.fetchall()
    
    conn.close()
    
    if project:
        return {
            'project': project,
            'ausschreibungen': ausschreibungen,
            'angebote': angebote
        }
    else:
        return None

# Add more database operations as needed