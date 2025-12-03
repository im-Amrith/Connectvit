from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGO_URI")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.server_info()  # Force connection on a request as the
    print("✅ Connected to MongoDB!")
except Exception as e:
    print("❌ Could not connect to MongoDB:", e)
