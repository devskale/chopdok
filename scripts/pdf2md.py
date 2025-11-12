import os
import pdfplumber
import re
from datetime import datetime

def count_words(text):
    return len(text.split())

def generate_metadata(pdf, text, title):
    num_pages = len(pdf.pages)
    word_count = count_words(text)
    char_count = len(text)
    creation_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    metadata = f"""---
title: {title}
date: {creation_date}
pages: {num_pages}
words: {word_count}
characters: {char_count}
---

"""
    return metadata

def pdf_to_markdown(pdf_path, output_dir, filename):
    try:
        # Ensure the filename ends with .md
        if not filename.endswith('.md'):
            filename += '.md'
        
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, filename)
        
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            markdown_content = ""
            
            for page in pdf.pages:
                text = page.extract_text()
                full_text += text
                
                # Basic Markdown conversion
                text = re.sub(r'^(\s*)([A-Z][A-Z\s]+[A-Z])(\s*)$', r'\1## \2\3', text, flags=re.MULTILINE)
                text = re.sub(r'^\s*•\s*', '- ', text, flags=re.MULTILINE)
                
                markdown_content += text + "\n\n---\n\n"
            
            # Generate metadata using the filename (without extension) as the title
            title = os.path.splitext(filename)[0]
            metadata = generate_metadata(pdf, full_text, title)
            
            # Combine metadata and content
            full_markdown = metadata + markdown_content
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_markdown)
        
        return output_file
    except Exception as e:
        print(f"An error occurred while converting {pdf_path}: {str(e)}")
        return None

def process_pdfs(input_dir, output_dir, filename_mapping=None):
    if filename_mapping is None:
        filename_mapping = {}
    
    for filename in os.listdir(input_dir):
        if filename.endswith('.pdf'):
            pdf_path = os.path.join(input_dir, filename)
            
            # Use the mapping if provided, otherwise use the PDF filename
            if filename in filename_mapping:
                output_filename = filename_mapping[filename]
            else:
                output_filename = os.path.splitext(filename)[0] + '.md'
            
            output_file = pdf_to_markdown(pdf_path, output_dir, output_filename)
            if output_file:
                print(f"Converted {filename} to {output_file}")
            else:
                print(f"Failed to convert {filename}")

# Usage
input_directory = '../../vDaten/.test/'
output_directory = '../../vDaten/.test/md/'
filename = '2022_06001_AAB_EV.pdf'

# Construct the full path to the input PDF
input_pdf_path = os.path.join(input_directory, filename)

# Check if the input file exists
if not os.path.exists(input_pdf_path):
    print(f"Error: The file {input_pdf_path} does not exist.")
else:
    # Create the output filename (replacing .pdf with .md)
    output_filename = os.path.splitext(filename)[0] + '.md'

    # Convert the PDF to Markdown
    output_file = pdf_to_markdown(input_pdf_path, output_directory, output_filename)
    if output_file:
        print(f"Successfully converted {filename} to {output_file}")
    else:
        print(f"Failed to convert {filename}")