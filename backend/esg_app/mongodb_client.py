import os
from pathlib import Path
from pymongo import MongoClient

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

def load_env():
    """Manual parser to load environment variables from .env to prevent extra package dependencies."""
    env_file = BASE_DIR / '.env'
    if env_file.exists():
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        key, _, val = line.partition('=')
                        os.environ[key.strip()] = val.strip()
        except Exception as e:
            print(f"Warning: Failed to parse .env file: {e}")

# Load the environment file
load_env()

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/esg_platform")

# Initialize client and db
client = MongoClient(MONGODB_URI)
db = client.get_database()
