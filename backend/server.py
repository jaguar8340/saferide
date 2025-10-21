from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
import io
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'saferide-secret-key-2024')

# Upload directory
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str  # 'admin' or 'user'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = 'user'

class UserLogin(BaseModel):
    username: str
    password: str

class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # 'income' or 'expense'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AccountCreate(BaseModel):
    name: str
    type: str

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    description: str
    type: str  # 'income' or 'expense'
    amount: float
    account_id: str
    account_name: Optional[str] = None
    remarks: Optional[str] = None
    file_url: Optional[str] = None
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    date: str
    description: str
    type: str
    amount: float
    account_id: str
    remarks: Optional[str] = None

# Auth helpers
def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = authorization.replace('Bearer ', '')
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
    user = User(username=user_data.username, role=user_data.role)
    user_dict = user.model_dump()
    user_dict['password_hash'] = password_hash
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return {"message": "User created successfully", "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(credentials.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = jwt.encode({"user_id": user['id'], "username": user['username'], "role": user['role']}, JWT_SECRET, algorithm='HS256')
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role']
        }
    }

# Account routes
@api_router.get("/accounts", response_model=List[Account])
async def get_accounts():
    accounts = await db.accounts.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    for account in accounts:
        if isinstance(account.get('created_at'), str):
            account['created_at'] = datetime.fromisoformat(account['created_at'])
    return accounts

@api_router.post("/accounts", response_model=Account)
async def create_account(account_data: AccountCreate, user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create accounts")
    
    account = Account(name=account_data.name, type=account_data.type)
    account_dict = account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    
    await db.accounts.insert_one(account_dict)
    return account

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete accounts")
    
    result = await db.accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"message": "Account deleted successfully"}

# Transaction routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(year: int = None, month: int = None, user: dict = Depends(get_current_user)):
    query = {}
    if year and month:
        # Filter by year and month
        query = {"date": {"$regex": f"^{year}-{month:02d}"}}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Populate account names
    for trans in transactions:
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
        
        account = await db.accounts.find_one({"id": trans['account_id']}, {"_id": 0})
        if account:
            trans['account_name'] = account['name']
    
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, user: dict = Depends(get_current_user)):
    transaction = Transaction(
        date=transaction_data.date,
        description=transaction_data.description,
        type=transaction_data.type,
        amount=transaction_data.amount,
        account_id=transaction_data.account_id,
        remarks=transaction_data.remarks,
        user_id=user['id']
    )
    
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    
    # Get account name
    account = await db.accounts.find_one({"id": transaction_data.account_id}, {"_id": 0})
    if account:
        transaction_dict['account_name'] = account['name']
    
    await db.transactions.insert_one(transaction_dict)
    return transaction

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, transaction_data: TransactionCreate, user: dict = Depends(get_current_user)):
    update_data = transaction_data.model_dump()
    
    # Get account name
    account = await db.accounts.find_one({"id": transaction_data.account_id}, {"_id": 0})
    if account:
        update_data['account_name'] = account['name']
    
    result = await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction updated successfully"}

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted successfully"}

# File upload
@api_router.post("/upload/{transaction_id}")
async def upload_file(transaction_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # Save file
    file_extension = file.filename.split('.')[-1]
    file_name = f"{transaction_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    
    with open(file_path, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    
    # Update transaction
    file_url = f"/api/files/{file_name}"
    await db.transactions.update_one({"id": transaction_id}, {"$set": {"file_url": file_url}})
    
    return {"file_url": file_url}

@api_router.get("/files/{file_name}")
async def get_file(file_name: str):
    file_path = UPLOAD_DIR / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Reports
@api_router.get("/reports/yearly")
async def get_yearly_report(year: int, user: dict = Depends(get_current_user)):
    # Get all transactions for the year
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{year}"}},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by account
    account_totals = {}
    
    for trans in transactions:
        account_id = trans['account_id']
        account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
        
        if account:
            account_name = account['name']
            if account_name not in account_totals:
                account_totals[account_name] = {'income': 0, 'expense': 0, 'type': account['type']}
            
            if trans['type'] == 'income':
                account_totals[account_name]['income'] += trans['amount']
            else:
                account_totals[account_name]['expense'] += trans['amount']
    
    # Calculate monthly totals
    monthly_totals = {}
    for month in range(1, 13):
        month_trans = [t for t in transactions if t['date'].startswith(f"{year}-{month:02d}")]
        income = sum([t['amount'] for t in month_trans if t['type'] == 'income'])
        expense = sum([t['amount'] for t in month_trans if t['type'] == 'expense'])
        monthly_totals[f"{year}-{month:02d}"] = {
            'income': income,
            'expense': expense,
            'total': income - expense
        }
    
    return {
        'account_totals': account_totals,
        'monthly_totals': monthly_totals
    }

@api_router.get("/reports/export-pdf")
async def export_pdf(year: int, month: int, user: dict = Depends(get_current_user)):
    
    # Get transactions for the month
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{year}-{month:02d}"}},
        {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    # Populate account names
    for trans in transactions:
        account = await db.accounts.find_one({"id": trans['account_id']}, {"_id": 0})
        if account:
            trans['account_name'] = account['name']
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f"Fahrschule Saferide - {month}/{year}", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.5*cm))
    
    # Table data
    table_data = [['Datum', 'Bezeichnung', 'Konto', 'Einnahmen', 'Ausgaben', 'Bemerkungen']]
    
    total_income = 0
    total_expense = 0
    
    for trans in transactions:
        income = f"{trans['amount']:.2f}" if trans['type'] == 'income' else ''
        expense = f"{trans['amount']:.2f}" if trans['type'] == 'expense' else ''
        
        if trans['type'] == 'income':
            total_income += trans['amount']
        else:
            total_expense += trans['amount']
        
        table_data.append([
            trans['date'],
            trans['description'][:30],
            trans.get('account_name', '')[:20],
            income,
            expense,
            trans.get('remarks', '')[:30]
        ])
    
    # Totals
    table_data.append(['', '', 'Total:', f"{total_income:.2f}", f"{total_expense:.2f}", ''])
    total_balance = total_income - total_expense
    table_data.append(['', '', 'Einkommen:', '', f"{total_balance:.2f}", ''])
    
    # Create table
    table = Table(table_data, colWidths=[2.5*cm, 4*cm, 3.5*cm, 2.5*cm, 2.5*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 1), (4, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, -2), (-1, -1), colors.lightgrey),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=saferide_{year}_{month:02d}.pdf"}
    )

# User management (Admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can view users")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    if user_id == user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()