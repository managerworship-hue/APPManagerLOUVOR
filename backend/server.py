from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
import uuid
import json
import asyncio
import io
import re
import docx
from pypdf import PdfReader
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Config
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', '10080'))

# VAPID para Web Push (gera em https://vapidkeys.com ou com npx web-push generate-vapid-keys)
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIMS = {"sub": "mailto:admin@worshipmanager.com"}

async def send_push_to_users(user_ids: List[str], title: str, body: str, url: str = '/'):
    """Envia notificação push a uma lista de utilizadores pelo ID."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys não configuradas — notificações push desativadas")
        return
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush não instalado — adicione ao requirements.txt")
        return

    payload = json.dumps({"title": title, "body": body, "url": url})

    # Buscar subscrições dos utilizadores
    subs = await db.push_subscriptions.find({"user_id": {"$in": user_ids}}).to_list(None)

    for sub in subs:
        try:
            webpush(
                subscription_info=sub["subscription"],
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except Exception as e:
            logger.error(f"Erro ao enviar push para {sub.get('user_id')}: {e}")
            # Remover subscrição inválida
            if "410" in str(e) or "404" in str(e):
                await db.push_subscriptions.delete_one({"_id": sub["_id"]})

# DB
client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=5000,
)
db = client[DB_NAME]

# Auth utilities
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# Permission constants
PERM_EDIT_SCALES = "edit_scales"
PERM_EDIT_SONGS = "edit_songs"
PERM_EDIT_ANNOUNCEMENTS = "edit_announcements"
ALL_PERMISSIONS = [PERM_EDIT_SCALES, PERM_EDIT_SONGS, PERM_EDIT_ANNOUNCEMENTS]

ROLE_LEADER = "leader"
ROLE_MEMBER = "member"

# App
app = FastAPI(title="Worship Manager API")
api_router = APIRouter(prefix="/api")


# ============ MODELS ============

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    permissions: List[str] = []
    instruments: List[str] = []
    ministry_id: str
    avatar: Optional[str] = ""

class MinistryOut(BaseModel):
    id: str
    name: str
    invite_code: str
    api_key: Optional[str] = None

class SignupReq(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6)
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: UserOut
    ministry: MinistryOut

class UpdateProfileReq(BaseModel):
    name: Optional[str] = None
    instruments: Optional[List[str]] = None
    avatar: Optional[str] = None

class UpdateMemberReq(BaseModel):
    role: Optional[Literal["leader", "member"]] = None
    permissions: Optional[List[str]] = None
    instruments: Optional[List[str]] = None

class SongReq(BaseModel):
    title: str
    artist: Optional[str] = ""
    key: Optional[str] = ""
    bpm: Optional[int] = None
    youtube_url: Optional[str] = ""
    cifra_url: Optional[str] = ""
    lyrics: Optional[str] = ""

class ScaleReq(BaseModel):
    title: str
    date: str  # ISO format
    time: Optional[str] = ""
    location: Optional[str] = ""
    notes: Optional[str] = ""
    song_ids: List[str] = []
    musician_ids: List[str] = []
    musician_instruments: Optional[dict] = {}

class AnnouncementReq(BaseModel):
    title: str
    body: str

class PushSubscriptionReq(BaseModel):
    endpoint: str
    keys: dict
    expirationTime: Optional[Any] = None

class GoogleDriveImportReq(BaseModel):
    access_token: str

class GoogleSyncConfigReq(BaseModel):
    client_id: str
    client_secret: str
    refresh_token: str


# ============ HELPERS ============

def hash_password(p: str) -> str:
    return pwd_context.hash(p)

def verify_password(p: str, h: str) -> bool:
    try:
        return pwd_context.verify(p, h)
    except Exception:
        return False

def make_token(user_id: str, ministry_id: str) -> str:
    payload = {
        "sub": user_id,
        "ministry_id": ministry_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def gen_invite_code() -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

def gen_api_key() -> str:
    return "lvr_" + secrets.token_urlsafe(32)

def serialize_user(u: dict) -> UserOut:
    return UserOut(
        id=u["_id"],
        name=u["name"],
        email=u["email"],
        role=u.get("role", ROLE_MEMBER),
        permissions=u.get("permissions", []),
        instruments=u.get("instruments", []),
        ministry_id=u["ministry_id"],
        avatar=u.get("avatar", ""),
    )

def serialize_ministry(m: dict, include_api_key: bool = True) -> MinistryOut:
    return MinistryOut(
        id=m["_id"],
        name=m["name"],
        invite_code=m["invite_code"],
        api_key=m.get("api_key") if include_api_key else None,
    )

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

async def require_leader(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != ROLE_LEADER:
        raise HTTPException(status_code=403, detail="Acesso restrito ao líder")
    return user

def require_perm(perm: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") == ROLE_LEADER:
            return user
        if perm in user.get("permissions", []):
            return user
        raise HTTPException(status_code=403, detail=f"Permissão '{perm}' necessária")
    return dep

async def get_ministry_by_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> dict:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key ausente")
    m = await db.ministries.find_one({"api_key": x_api_key})
    if not m:
        raise HTTPException(status_code=401, detail="API key inválida")
    return m


# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"app": "Worship Manager", "status": "ok"}


# ---- AUTH ----

@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if not req.ministry_name and not req.invite_code:
        raise HTTPException(status_code=400, detail="Informe o nome do ministério ou um código de convite")

    if req.invite_code:
        ministry = await db.ministries.find_one({"invite_code": req.invite_code.upper()})
        if not ministry:
            raise HTTPException(status_code=404, detail="Código de convite inválido")
        role = ROLE_MEMBER
        permissions = []
    else:
        # Create new ministry, user is leader
        # Generate unique invite code
        for _ in range(10):
            code = gen_invite_code()
            if not await db.ministries.find_one({"invite_code": code}):
                break
        ministry = {
            "_id": str(uuid.uuid4()),
            "name": req.ministry_name.strip(),
            "invite_code": code,
            "api_key": gen_api_key(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.ministries.insert_one(ministry)
        role = ROLE_LEADER
        permissions = ALL_PERMISSIONS.copy()

    user = {
        "_id": str(uuid.uuid4()),
        "name": req.name.strip(),
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "ministry_id": ministry["_id"],
        "role": role,
        "permissions": permissions,
        "instruments": [],
        "avatar": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)

    # Notificar líderes quando novo membro entra (apenas se não for o primeiro — criador do ministério)
    if role == ROLE_MEMBER:
        leaders = await db.users.find({"ministry_id": ministry["_id"], "role": ROLE_LEADER}).to_list(None)
        leader_ids = [l["_id"] for l in leaders]
        if leader_ids:
            asyncio.create_task(send_push_to_users(
                leader_ids,
                title="Novo membro",
                body=f"{req.name.strip()} entrou no ministério.",
                url="/membros",
            ))

    return AuthResponse(
        token=make_token(user["_id"], ministry["_id"]),
        user=serialize_user(user),
        ministry=serialize_ministry(ministry, include_api_key=(role == ROLE_LEADER)),
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    ministry = await db.ministries.find_one({"_id": user["ministry_id"]})
    if not ministry:
        raise HTTPException(status_code=404, detail="Ministério não encontrado")
    return AuthResponse(
        token=make_token(user["_id"], ministry["_id"]),
        user=serialize_user(user),
        ministry=serialize_ministry(ministry, include_api_key=(user["role"] == ROLE_LEADER)),
    )

@api_router.get("/auth/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

@api_router.put("/auth/me", response_model=UserOut)
async def update_me(req: UpdateProfileReq, user: dict = Depends(get_current_user)):
    updates = {}
    if req.name is not None:
        updates["name"] = req.name.strip()
    if req.instruments is not None:
        updates["instruments"] = req.instruments
    if req.avatar is not None:
        updates["avatar"] = req.avatar
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user.update(updates)
    return serialize_user(user)


# ---- MINISTRY ----

@api_router.get("/ministry", response_model=MinistryOut)
async def get_ministry(user: dict = Depends(get_current_user)):
    m = await db.ministries.find_one({"_id": user["ministry_id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Ministério não encontrado")
    return serialize_ministry(m, include_api_key=(user["role"] == ROLE_LEADER))

@api_router.delete("/ministry")
async def delete_ministry(leader: dict = Depends(require_leader)):
    mid = leader["ministry_id"]
    await db.announcements.delete_many({"ministry_id": mid})
    await db.scales.delete_many({"ministry_id": mid})
    await db.songs.delete_many({"ministry_id": mid})
    await db.users.delete_many({"ministry_id": mid})
    await db.ministries.delete_one({"_id": mid})
    return {"ok": True, "detail": "Ministério e recursos excluídos com sucesso"}

@api_router.get("/ministry/members", response_model=List[UserOut])
async def list_members(user: dict = Depends(get_current_user)):
    cursor = db.users.find({"ministry_id": user["ministry_id"]}, {"password_hash": 0})
    members = await cursor.to_list(500)
    return [serialize_user(m) for m in members]

@api_router.put("/ministry/members/{member_id}", response_model=UserOut)
async def update_member(member_id: str, req: UpdateMemberReq, leader: dict = Depends(require_leader)):
    target = await db.users.find_one({"_id": member_id, "ministry_id": leader["ministry_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    updates = {}
    if req.role is not None:
        updates["role"] = req.role
        if req.role == ROLE_LEADER:
            updates["permissions"] = ALL_PERMISSIONS.copy()
    if req.permissions is not None:
        valid_perms = [p for p in req.permissions if p in ALL_PERMISSIONS]
        if updates.get("role") != ROLE_LEADER:
            updates["permissions"] = valid_perms
    if req.instruments is not None:
        updates["instruments"] = req.instruments

    if updates:
        await db.users.update_one({"_id": member_id}, {"$set": updates})
        target.update(updates)

    # Notificação de promoção a líder
    if updates.get("role") == ROLE_LEADER:
        asyncio.create_task(send_push_to_users(
            [member_id],
            title="Parabéns! 🌟",
            body="Você foi promovido a líder do ministério.",
            url="/",
        ))

    return serialize_user(target)

@api_router.delete("/ministry/members/{member_id}")
async def remove_member(member_id: str, leader: dict = Depends(require_leader)):
    if member_id == leader["_id"]:
        raise HTTPException(status_code=400, detail="Você não pode remover a si mesmo")
    target = await db.users.find_one({"_id": member_id, "ministry_id": leader["ministry_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    await db.users.delete_one({"_id": member_id})
    # Subscrições push do membro removido
    await db.push_subscriptions.delete_many({"user_id": member_id})
    return {"ok": True}

@api_router.post("/ministry/api-key/rotate", response_model=MinistryOut)
async def rotate_api_key(leader: dict = Depends(require_leader)):
    new_key = gen_api_key()
    await db.ministries.update_one({"_id": leader["ministry_id"]}, {"$set": {"api_key": new_key}})
    m = await db.ministries.find_one({"_id": leader["ministry_id"]})
    return serialize_ministry(m)


# ---- SONGS ----

def serialize_song(s: dict) -> dict:
    return {
        "id": s["_id"],
        "title": s["title"],
        "artist": s.get("artist", ""),
        "key": s.get("key", ""),
        "bpm": s.get("bpm"),
        "youtube_url": s.get("youtube_url", ""),
        "cifra_url": s.get("cifra_url", ""),
        "lyrics": s.get("lyrics", ""),
        "created_at": s.get("created_at", ""),
    }

@api_router.get("/songs")
async def list_songs(user: dict = Depends(get_current_user)):
    cursor = db.songs.find({"ministry_id": user["ministry_id"]}).sort("title", 1)
    items = await cursor.to_list(1000)
    return [serialize_song(s) for s in items]

@api_router.get("/songs/{song_id}")
async def get_song(song_id: str, user: dict = Depends(get_current_user)):
    s = await db.songs.find_one({"_id": song_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Música não encontrada")
    return serialize_song(s)

@api_router.post("/songs")
async def create_song(req: SongReq, user: dict = Depends(require_leader)):
    song = {
        "_id": str(uuid.uuid4()),
        "ministry_id": user["ministry_id"],
        "title": req.title.strip(),
        "artist": (req.artist or "").strip(),
        "key": (req.key or "").strip(),
        "bpm": req.bpm,
        "youtube_url": (req.youtube_url or "").strip(),
        "cifra_url": (req.cifra_url or "").strip(),
        "lyrics": req.lyrics or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.songs.insert_one(song)
    return serialize_song(song)

@api_router.put("/songs/{song_id}")
async def update_song(song_id: str, req: SongReq, user: dict = Depends(require_leader)):
    s = await db.songs.find_one({"_id": song_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Música não encontrada")
    updates = req.dict()
    await db.songs.update_one({"_id": song_id}, {"$set": updates})
    s.update(updates)
    return serialize_song(s)

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, user: dict = Depends(require_leader)):
    res = await db.songs.delete_one({"_id": song_id, "ministry_id": user["ministry_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Música não encontrada")
    return {"ok": True}


@api_router.post("/songs/import/google-drive")
async def import_from_google_drive(req: GoogleDriveImportReq, user: dict = Depends(require_leader)):
    logger = logging.getLogger("google_drive_import")
    try:
        # Create Google API client using the access_token
        creds = Credentials(token=req.access_token)
        service = build("drive", "v3", credentials=creds)
        
        # 1. Encontrar a pasta "Louvor" no Google Drive
        query = "name = 'Louvor' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        response = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
        files = response.get("files", [])
        if not files:
            raise HTTPException(
                status_code=404, 
                detail="Pasta 'Louvor' não encontrada no seu Google Drive. Por favor, crie uma pasta chamada 'Louvor' no seu Drive."
            )
        
        louvor_folder_id = files[0]["id"]
        
        # 2. Listar todas as subpastas dentro de "Louvor"
        query = f"'{louvor_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        response = service.files().list(q=query, spaces="drive", fields="files(id, name)", pageSize=1000).execute()
        song_folders = response.get("files", [])
        
        imported_count = 0
        errors = []
        
        if not song_folders:
            errors.append("Aviso: Nenhuma subpasta de música foi encontrada dentro da pasta 'Louvor'. Certifique-se de criar uma pasta para cada música.")
        
        for folder in song_folders:
            folder_id = folder["id"]
            folder_name = folder["name"]
            
            # Procurar arquivos .docx, .pdf ou Google Docs dentro da subpasta
            query = f"'{folder_id}' in parents and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document') and trashed = false"
            response = service.files().list(q=query, spaces="drive", fields="files(id, name, mimeType)").execute()
            files_in_folder = response.get("files", [])
            
            if not files_in_folder:
                errors.append(f"Aviso: A pasta '{folder_name}' não contém arquivos .docx, .pdf ou Google Docs válidos.")
                continue
                
            # Pegar o primeiro arquivo encontrado
            file_to_parse = files_in_folder[0]
            file_id = file_to_parse["id"]
            file_name = file_to_parse["name"]
            mime_type = file_to_parse["mimeType"]
            
            try:
                # Baixar ou exportar o arquivo em memória
                if mime_type == 'application/vnd.google-apps.document':
                    # Exportar Google Doc nativo como Word (.docx)
                    file_content = service.files().export(
                        fileId=file_id, 
                        mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ).execute()
                    mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                else:
                    file_content = service.files().get_media(fileId=file_id).execute()
                
                # Extrair texto com base no tipo de arquivo
                text = ""
                if mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    # Parse DOCX
                    doc = docx.Document(io.BytesIO(file_content))
                    text = "\n".join([p.text for p in doc.paragraphs])
                elif mime_type == 'application/pdf':
                    # Parse PDF
                    reader = PdfReader(io.BytesIO(file_content))
                    pages_text = []
                    for page in reader.pages:
                        t = page.extract_text()
                        if t:
                            pages_text.append(t)
                    text = "\n".join(pages_text)
                    
                if not text.strip():
                    errors.append(f"Aviso: O arquivo '{file_name}' na pasta '{folder_name}' está vazio.")
                    continue
                    
                # Analisar a primeira linha para extrair título, tom, bpm
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if not lines:
                    errors.append(f"Aviso: Não foi possível ler texto no arquivo '{file_name}'.")
                    continue
                    
                first_line = lines[0]
                
                # Regex robusto que aceita:
                # [NOME DA MUSICA - TOM - BPM] ou NOME DA MUSICA - TOM - 70 BPM ou NOME - TOM - BPM 70 (e acordes como C#m7 ou D/F#)
                match = re.match(
                    r"(?:\[)?\s*([^-\[\]]+?)\s*-\s*(?:\"|')?([A-G][#b]?[a-zA-Z0-9\/]*)(?:\"|')?\s*-\s*(?:[Bb][Pp][Mm])?\s*(\d{2,3})\s*(?:[Bb][Pp][Mm])?\s*(?:\])?", 
                    first_line
                )
                
                if match:
                    title = match.group(1).strip()
                    key = match.group(2).strip()
                    bpm = int(match.group(3).strip())
                    # Letra e cifra é o resto do arquivo (excluindo a primeira linha de metadados)
                    lyrics = "\n".join(lines[1:])
                else:
                    # Fallback: nome da pasta como título, texto inteiro como letra
                    title = folder_name.strip()
                    key = ""
                    bpm = None
                    lyrics = text
                    errors.append(f"Info: Arquivo '{file_name}' não segue o formato '[NOME - TOM - BPM]'. Usámos o nome da pasta '{title}' como título.")
                    
                # Verificar se já existe uma música com este título no ministério
                existing = await db.songs.find_one({
                    "ministry_id": user["ministry_id"], 
                    "title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}
                })
                
                if existing:
                    errors.append(f"Info: A música '{title}' já existe no seu repertório (ignorada).")
                    # Se a música já existir, mas estiver sem letra ou tom, atualiza-a
                    if not existing.get("lyrics") or not existing.get("key"):
                        await db.songs.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {
                                "key": key or existing.get("key", ""),
                                "bpm": bpm or existing.get("bpm"),
                                "lyrics": lyrics or existing.get("lyrics", "")
                            }}
                        )
                    continue
                    
                # Cadastrar nova música
                new_song = {
                    "_id": str(uuid.uuid4()),
                    "ministry_id": user["ministry_id"],
                    "title": title,
                    "artist": "",
                    "key": key,
                    "bpm": bpm,
                    "youtube_url": "",
                    "cifra_url": "",
                    "lyrics": lyrics,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.songs.insert_one(new_song)
                imported_count += 1
                errors.append(f"Sucesso: Música '{title}' importada!")
                
            except Exception as e:
                logger.error(f"Erro ao processar arquivo do Google Drive para {folder_name}: {str(e)}")
                errors.append(f"Erro em '{folder_name}': {str(e)}")
                continue
                
        return {
            "ok": True, 
            "imported_count": imported_count, 
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Erro geral durante importação do Google Drive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao conectar com Google Drive: {str(e)}")

def refresh_google_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    import requests
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    r = requests.post(url, data=data, timeout=10)
    if r.status_code != 200:
        raise Exception(f"Falha ao renovar o token do Google: {r.text}")
    res = r.json()
    return res["access_token"]

@api_router.get("/songs/import/google-drive/config")
async def get_google_sync_config(user: dict = Depends(require_leader)):
    m = await db.ministries.find_one({"_id": user["ministry_id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Ministério não encontrado")
    config = m.get("google_sync_credentials")
    if not config:
        return {"configured": False}
    return {
        "configured": True,
        "client_id": config.get("client_id", "")
    }

@api_router.post("/songs/import/google-drive/config")
async def save_google_sync_config(req: GoogleSyncConfigReq, user: dict = Depends(require_leader)):
    try:
        # Validar se as credenciais funcionam fazendo um refresh teste
        refresh_google_access_token(
            req.client_id.strip(),
            req.client_secret.strip(),
            req.refresh_token.strip()
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Credenciais do Google inválidas. Verifique os dados introduzidos: {str(e)}"
        )

    await db.ministries.update_one(
        {"_id": user["ministry_id"]},
        {"$set": {
            "google_sync_credentials": {
                "client_id": req.client_id.strip(),
                "client_secret": req.client_secret.strip(),
                "refresh_token": req.refresh_token.strip(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    return {"ok": True, "message": "Sincronização permanente ativada e validada com sucesso!"}

@api_router.delete("/songs/import/google-drive/config")
async def delete_google_sync_config(user: dict = Depends(require_leader)):
    await db.ministries.update_one(
        {"_id": user["ministry_id"]},
        {"$unset": {"google_sync_credentials": ""}}
    )
    return {"ok": True}

@api_router.post("/songs/import/google-drive/sync")
async def sync_google_drive_permanent(user: dict = Depends(require_leader)):
    m = await db.ministries.find_one({"_id": user["ministry_id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Ministério não encontrado")
    config = m.get("google_sync_credentials")
    if not config:
        raise HTTPException(
            status_code=400,
            detail="Sincronização permanente não configurada. Configure as suas credenciais no Perfil primeiro."
        )

    try:
        access_token = refresh_google_access_token(
            config["client_id"],
            config["client_secret"],
            config["refresh_token"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Falha ao renovar o acesso ao Google Drive: {str(e)}"
        )

    import_req = GoogleDriveImportReq(access_token=access_token)
    return await import_from_google_drive(import_req, user)


# ---- SCALES ----

def serialize_scale(s: dict) -> dict:
    return {
        "id": s["_id"],
        "title": s["title"],
        "date": s["date"],
        "time": s.get("time", ""),
        "location": s.get("location", ""),
        "notes": s.get("notes", ""),
        "song_ids": s.get("song_ids", []),
        "musician_ids": s.get("musician_ids", []),
        "musician_instruments": s.get("musician_instruments", {}),
        "created_at": s.get("created_at", ""),
    }

@api_router.get("/scales")
async def list_scales(user: dict = Depends(get_current_user)):
    cursor = db.scales.find({"ministry_id": user["ministry_id"]}).sort("date", 1)
    items = await cursor.to_list(1000)
    return [serialize_scale(s) for s in items]

@api_router.get("/scales/{scale_id}")
async def get_scale(scale_id: str, user: dict = Depends(get_current_user)):
    s = await db.scales.find_one({"_id": scale_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    return serialize_scale(s)

@api_router.post("/scales")
async def create_scale(req: ScaleReq, user: dict = Depends(require_leader)):
    scale = {
        "_id": str(uuid.uuid4()),
        "ministry_id": user["ministry_id"],
        "title": req.title.strip(),
        "date": req.date,
        "time": req.time or "",
        "location": req.location or "",
        "notes": req.notes or "",
        "song_ids": req.song_ids,
        "musician_ids": req.musician_ids,
        "musician_instruments": req.musician_instruments or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.scales.insert_one(scale)

    # Notificar todos os membros do ministério
    members = await db.users.find({"ministry_id": user["ministry_id"], "_id": {"$ne": user["_id"]}}).to_list(None)
    member_ids = [m["_id"] for m in members]
    if member_ids:
        asyncio.create_task(send_push_to_users(
            member_ids,
            title="Nova escala criada 📅",
            body=f"{req.title.strip()} — {req.date}",
            url="/escalas",
        ))

    return serialize_scale(scale)

@api_router.put("/scales/{scale_id}")
async def update_scale(scale_id: str, req: ScaleReq, user: dict = Depends(require_leader)):
    s = await db.scales.find_one({"_id": scale_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Escala não encontrada")

    old_musician_ids = set(s.get("musician_ids", []))
    new_musician_ids = set(req.musician_ids)
    removed_ids = list(old_musician_ids - new_musician_ids)

    updates = req.dict()
    await db.scales.update_one({"_id": scale_id}, {"$set": updates})
    s.update(updates)

    # Notificar músicos que continuam na escala sobre a alteração
    notif_ids = list(new_musician_ids - {user["_id"]})
    if notif_ids:
        asyncio.create_task(send_push_to_users(
            notif_ids,
            title="Escala atualizada ✏️",
            body=f"A escala '{req.title.strip()}' foi alterada.",
            url=f"/escala/{scale_id}",
        ))

    # Notificar músicos removidos da escala
    if removed_ids:
        asyncio.create_task(send_push_to_users(
            removed_ids,
            title="Removido da escala",
            body=f"Você foi removido da escala '{req.title.strip()}'.",
            url="/escalas",
        ))

    return serialize_scale(s)

@api_router.delete("/scales/{scale_id}")
async def delete_scale(scale_id: str, user: dict = Depends(require_leader)):
    res = await db.scales.delete_one({"_id": scale_id, "ministry_id": user["ministry_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    return {"ok": True}


# ---- ANNOUNCEMENTS ----

def serialize_announcement(a: dict) -> dict:
    return {
        "id": a["_id"],
        "title": a["title"],
        "body": a["body"],
        "author_id": a.get("author_id", ""),
        "author_name": a.get("author_name", ""),
        "created_at": a.get("created_at", ""),
    }

@api_router.get("/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    cursor = db.announcements.find({"ministry_id": user["ministry_id"]}).sort("created_at", -1)
    items = await cursor.to_list(500)
    return [serialize_announcement(a) for a in items]

@api_router.post("/announcements")
async def create_announcement(req: AnnouncementReq, user: dict = Depends(require_perm(PERM_EDIT_ANNOUNCEMENTS))):
    ann = {
        "_id": str(uuid.uuid4()),
        "ministry_id": user["ministry_id"],
        "title": req.title.strip(),
        "body": req.body.strip(),
        "author_id": user["_id"],
        "author_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.announcements.insert_one(ann)

    # Notificar todos os membros do ministério
    members = await db.users.find({"ministry_id": user["ministry_id"], "_id": {"$ne": user["_id"]}}).to_list(None)
    member_ids = [m["_id"] for m in members]
    if member_ids:
        asyncio.create_task(send_push_to_users(
            member_ids,
            title=f"📢 {req.title.strip()}",
            body=req.body.strip()[:80] + ("..." if len(req.body) > 80 else ""),
            url="/",
        ))

    return serialize_announcement(ann)

@api_router.put("/announcements/{ann_id}")
async def update_announcement(ann_id: str, req: AnnouncementReq, user: dict = Depends(get_current_user)):
    a = await db.announcements.find_one({"_id": ann_id, "ministry_id": user["ministry_id"]})
    if not a:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    if user.get("role") != ROLE_LEADER and a.get("author_id") != user["_id"] and PERM_EDIT_ANNOUNCEMENTS not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Sem permissão")
    updates = {"title": req.title.strip(), "body": req.body.strip()}
    await db.announcements.update_one({"_id": ann_id}, {"$set": updates})
    a.update(updates)
    return serialize_announcement(a)

@api_router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, user: dict = Depends(get_current_user)):
    a = await db.announcements.find_one({"_id": ann_id, "ministry_id": user["ministry_id"]})
    if not a:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    if user.get("role") != ROLE_LEADER and a.get("author_id") != user["_id"] and PERM_EDIT_ANNOUNCEMENTS not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Sem permissão")
    await db.announcements.delete_one({"_id": ann_id})
    return {"ok": True}


# ---- STATS ----

@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    mid = user["ministry_id"]
    members = await db.users.count_documents({"ministry_id": mid})
    songs = await db.songs.count_documents({"ministry_id": mid})
    scales = await db.scales.count_documents({"ministry_id": mid})
    announcements = await db.announcements.count_documents({"ministry_id": mid})

    now_iso = datetime.now(timezone.utc).date().isoformat()
    upcoming = await db.scales.find(
        {"ministry_id": mid, "date": {"$gte": now_iso}}
    ).sort("date", 1).limit(1).to_list(1)
    next_scale = serialize_scale(upcoming[0]) if upcoming else None

    return {
        "members": members,
        "songs": songs,
        "scales": scales,
        "announcements": announcements,
        "next_scale": next_scale,
    }


# ============ EXTERNAL API (X-API-Key) ============

@api_router.get("/external/ministry")
async def ext_ministry(m: dict = Depends(get_ministry_by_api_key)):
    return {"id": m["_id"], "name": m["name"]}

@api_router.get("/external/songs")
async def ext_songs(m: dict = Depends(get_ministry_by_api_key)):
    cursor = db.songs.find({"ministry_id": m["_id"]}).sort("title", 1)
    items = await cursor.to_list(1000)
    return [serialize_song(s) for s in items]

@api_router.get("/external/scales")
async def ext_scales(
    upcoming: bool = False,
    limit: int = 50,
    m: dict = Depends(get_ministry_by_api_key),
):
    q = {"ministry_id": m["_id"]}
    if upcoming:
        q["date"] = {"$gte": datetime.now(timezone.utc).date().isoformat()}
    cursor = db.scales.find(q).sort("date", 1).limit(min(limit, 200))
    items = await cursor.to_list(limit)
    # Hydrate setlist with BPM
    result = []
    for s in items:
        setlist = []
        for sid in s.get("song_ids", []):
            song = await db.songs.find_one({"_id": sid, "ministry_id": m["_id"]})
            if song:
                setlist.append({
                    "id": song["_id"],
                    "title": song["title"],
                    "artist": song.get("artist", ""),
                    "key": song.get("key", ""),
                    "bpm": song.get("bpm"),
                    "youtube_url": song.get("youtube_url", ""),
                    "cifra_url": song.get("cifra_url", ""),
                })
        result.append({
            **serialize_scale(s),
            "setlist": setlist,
        })
    return result

@api_router.get("/external/scales/{scale_id}")
async def ext_scale_detail(scale_id: str, m: dict = Depends(get_ministry_by_api_key)):
    s = await db.scales.find_one({"_id": scale_id, "ministry_id": m["_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    setlist = []
    for sid in s.get("song_ids", []):
        song = await db.songs.find_one({"_id": sid, "ministry_id": m["_id"]})
        if song:
            setlist.append({
                "id": song["_id"],
                "title": song["title"],
                "artist": song.get("artist", ""),
                "key": song.get("key", ""),
                "bpm": song.get("bpm"),
                "youtube_url": song.get("youtube_url", ""),
                "cifra_url": song.get("cifra_url", ""),
                "lyrics": song.get("lyrics", ""),
            })
    return {**serialize_scale(s), "setlist": setlist}


# ---- PUSH SUBSCRIPTIONS ----

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Retorna a chave pública VAPID para registro do Web Push."""
    return {"public_key": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def push_subscribe(req: PushSubscriptionReq, user: dict = Depends(get_current_user)):
    """Guarda a subscrição push do utilizador."""
    sub_data = {
        "endpoint": req.endpoint,
        "keys": req.keys,
        "expirationTime": req.expirationTime,
    }
    await db.push_subscriptions.update_one(
        {"user_id": user["_id"], "subscription.endpoint": req.endpoint},
        {"$set": {"user_id": user["_id"], "ministry_id": user["ministry_id"], "subscription": sub_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}

@api_router.delete("/push/unsubscribe")
async def push_unsubscribe(user: dict = Depends(get_current_user)):
    """Remove todas as subscrições push do utilizador."""
    await db.push_subscriptions.delete_many({"user_id": user["_id"]})
    return {"ok": True}


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:8001",
        "http://localhost:10000",
        "https://appmanager-louvor.onrender.com",  # ← URL real do Static Site
        "https://setlist-metronomo-app.onrender.com"  # ← URL real da App Metrónomo
    ],
    allow_origin_regex=r"https?://.*\.emergent.*", # Permite domínios de preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.ministries.create_index("invite_code", unique=True)
        await db.ministries.create_index("api_key", unique=True)
        logger.info("✅ Conectado ao MongoDB com sucesso")
    except Exception as e:
        logger.error(f"⚠️ MongoDB indisponível no startup: {e}")
        # Servidor sobe mesmo assim — tentará conectar nas requisições@app.on_event("shutdown")
async def shutdown():
    client.close()
