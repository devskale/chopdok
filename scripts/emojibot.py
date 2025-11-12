import sys
import os
import argparse
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Force stdout to use UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()
token = os.getenv("HUGGINGFACE_TOKEN")

# Initialize InferenceClient with the token
client = InferenceClient(
    token=token,
)

def generate_emojis(keyword):
    """
    Function to generate emojis for the given keyword using the specified model.
    
    Args:
        keyword (str): The word to generate emojis for.
    """
    model = "microsoft/Phi-3-mini-4k-instruct"
    
    # Accumulate the full response
    full_response = []
    
    for message in client.chat_completion(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "Du bist ein emoji-bot. Du generierst auf Anfragen passende emojis. Du generierst nie text oder andere zeichen ausser emojis.",
            },
            {
                "role": "user",
                "content": f"Generiere 1 bis 3 emojis die das wort '{keyword}' treffend beschreiben.",
            },
        ],
        max_tokens=50,  # Adjusted for short emoji response
        stream=True,
    ):
        # Ensure content is only printed if present
        if message.choices and message.choices[0].delta.get("content"):
            full_response.append(message.choices[0].delta.content)
    
    # Join and return the full response as a string
    return ''.join(full_response)

if __name__ == "__main__":
    # Set up argument parser to accept a keyword from the command line
    parser = argparse.ArgumentParser(description="Generate emojis for a given keyword.")
    parser.add_argument("keyword", type=str, help="The word to generate emojis for")
    
    args = parser.parse_args()
    
    # Generate emojis for the provided keyword
    result = generate_emojis(args.keyword)
    
    # Output the result
    print(result)