# Python Scripts and Libraries Overview

This directory contains various Python scripts and libraries for processing documents and managing projects.

## Main Scripts

### pdf2md.py

- **Purpose**: Converts PDF files to Markdown format
- **Features**:
  - Processes PDF files from input directory
  - Supports filename mapping for output files
  - Generates Markdown files in specified output directory

### summarize.py

- **Purpose**: Creates document summaries
- **Features**:
  - Generates timestamps for summaries
  - Basic summary template functionality

### projects.py

- **Purpose**: Manages project-related operations
- **Features**:
  - (To be documented after reviewing the file)

### pagecounter.py

- **Purpose**: Counts pages in various document types across directories
- **Features**:
  - Supports multiple file formats:
    - PDF (using PyPDF2)
    - DOCX (using docx2python and python-docx)
    - XLSX (using openpyxl)
    - Images (JPG, PNG, GIF, etc. using PIL)
  - Recursive directory scanning
  - Detailed statistics by file type and directory
  - Accurate page counting methods for each format
  - Error handling for corrupt files
  - Command-line interface with detailed output option
- **Usage**:
  ```bash
  python pagecounter.py <directory_path> [-d|--detailed]
  ```

## Libraries

### pdf2md.elegant

A comprehensive package for PDF to Markdown conversion with additional features:

#### pdf2md/config.py

- **Purpose**: Configuration management
- **Features**:
  - Singleton configuration manager
  - Environment variable loading
  - API key management
  - Directory path resolution

#### pdf2md/main.py

- **Purpose**: Main conversion logic
- **Features**:
  - Directory statistics and file counting
  - PDF and office document processing
  - Multiple parser support (docling, marker)
  - Recursive directory processing

## Utility Scripts

- **ocr.py**: Optical Character Recognition functionality
- **parse.py**: Document parsing utilities
- **shared.py**: Shared utility functions
- **db.py**: Database interaction utilities

## Requirements

All dependencies are listed in requirements.txt
