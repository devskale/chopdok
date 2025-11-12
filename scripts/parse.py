import os
import re
from dotenv import load_dotenv
from llama_parse import LlamaParse
from llama_index.core import SimpleDirectoryReader

# Load environment variables from the parent directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path)

# Set up parser
parser = LlamaParse(
    result_type="markdown"  # "markdown" and "text" are available
)

filename = '2022_06001_AAB_EV.pdf'
input_file = os.path.join('../../vDaten/.test/', filename)
output_file = os.path.join('../../vDaten/.test/md/', f'{filename}.llamaparse.md')

# Use SimpleDirectoryReader to parse our file
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader(input_files=[input_file], file_extractor=file_extractor).load_data()

def process_newlines(text):
    # Replace \n with actual newlines, but avoid doubling existing newlines
    text = re.sub(r'([^\n])\n', r'\1\n', text)
    # Replace multiple consecutive newlines with two newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text

# Combine text from all documents and process newlines
full_text = "\n\n".join(process_newlines(doc.text) for doc in documents)

# Save the extracted and processed text
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(full_text)

print(f"Extracted and processed {len(documents)} pages from {filename}")
print(f"Saved full text to {output_file}")

# Print the first few characters of each processed document for verification
for i, doc in enumerate(documents):
    processed_text = process_newlines(doc.text)
    print(f"\nDocument {i + 1} preview (processed):")
    print(processed_text[:200] + "...")  # Print first 200 characters