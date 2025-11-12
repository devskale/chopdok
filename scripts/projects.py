import os
from dotenv import load_dotenv
import re
from typing import List, Optional
import logging
from shared import ProjectType, Project, ProjectStatus
from db import insert_project, create_database

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

ROOT_FOLDER = os.getenv("ROOT_FOLDER", "../vDaten/active")

def parse_directory_name(dir_name: str) -> Optional[Project]:
    logging.debug(f"Parsing directory name: {dir_name}")

    first_alpha_index = next((i for i, c in enumerate(dir_name) if c.isalpha()), None)

    if first_alpha_index is None:
        logging.debug(f"No alphabetic character found in directory name: {dir_name}")
        return None

    prjid = dir_name[:first_alpha_index].rstrip('_')
    prjid = prjid.replace('_', '-')
    remaining = dir_name[first_alpha_index:]
    parts = remaining.split('_')

    if len(parts) < 2:
        logging.debug(f"Not enough parts after PRJID in directory name: {dir_name}")
        return None

    project_name = parts[0]
    suffixes = parts[1:]

    project_type = None
    version = None
    lot_number = None
    company = None
    other_suffixes = []


    # default values for project_type, version, lot_number, company
    project_type = ProjectType.AN
    version = "1"
    lot_number = "100" # means all lots
    company = "WiWo"
    for suffix in suffixes:
        if suffix in ["AN", "AS"]:
            project_type = ProjectType[suffix]
            logging.debug(f"Project type identified: {project_type}")
        elif suffix.lower().startswith('v'):
            version = suffix[1:]
            logging.debug(f"Version identified: {version}")
        elif suffix.lower().startswith('l'):
            lot_number = suffix[1:]
            logging.debug(f"Lot number identified: {lot_number}")
        elif suffix.lower().startswith("f-"):
            company = suffix[2:]
            logging.debug(f"Company identified: {company}")
        else:
            other_suffixes.append(suffix)

    if project_type is None:
        logging.warning(f"No project type (AN/AS) found for directory: {dir_name}")
        return None

    project = Project(
        id=prjid,
        name=project_name,
        type=project_type,
        status=ProjectStatus.ACTIVE,  # Set default status to ACTIVE
        version=version,
        lot_number=lot_number,
        company=company,
        other_suffixes=other_suffixes
    )

    logging.debug(f"Parsed project: {project}")
    return project

def scan_projects() -> List[Project]:
    """
    Scans the ROOT_FOLDER directory for project directories, parses them,
    and inserts valid projects into the database.

    Returns:
        List[Project]: A list of parsed and inserted Project objects.
    """
    projects = []
    logging.info(f"Scanning directory: {ROOT_FOLDER}")
    for dir_name in os.listdir(ROOT_FOLDER):
        full_path = os.path.join(ROOT_FOLDER, dir_name)
        logging.debug(f"Checking directory: {full_path}")
        if os.path.isdir(full_path):
            project = parse_directory_name(dir_name)
            if project:
                project.path = full_path
                projects.append(project)
                insert_project(project)
                logging.info(f"Added project to database: {project}")
            else:
                logging.debug(f"Skipped invalid directory: {dir_name}")
    return projects

def main():
    create_database()
    projects = scan_projects()
    logging.info(f"Scanned and stored {len(projects)} projects in the database.")

if __name__ == "__main__":
    main()