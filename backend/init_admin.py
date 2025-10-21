import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"username": "admin"})
    
    if existing_admin:
        print("Admin user already exists")
        return
    
    # Create admin user
    password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "password_hash": password_hash,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    print("Admin user created successfully!")
    print("Username: admin")
    print("Password: admin123")
    
    # Create some default accounts
    default_accounts = [
        {"id": str(uuid.uuid4()), "name": "Einnahmen Fahrstunden", "type": "income", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Einnahmen Theorie", "type": "income", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ausgaben Leasing", "type": "expense", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ausgaben Miete", "type": "expense", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ausgaben Benzin", "type": "expense", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    for account in default_accounts:
        existing = await db.accounts.find_one({"name": account["name"]})
        if not existing:
            await db.accounts.insert_one(account)
    
    print("Default accounts created!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
