# scripts/summarize.py
import sys
from datetime import datetime

def summarize_document(file_path):
    # Get current time and date
    now = datetime.now()
    timestamp = now.strftime("%H:%M:%S %d-%m-%Y")
    
    # Create a simple summary message
    summary = f"Summarized at {timestamp}"
    
    return summary

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python summarize.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    summary = summarize_document(file_path)
    print(summary)