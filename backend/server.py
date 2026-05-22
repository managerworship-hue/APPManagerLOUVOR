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
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
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

# DB
client = AsyncIOMotorClient(MONGO_URL)
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
app = FastAPI(title="LouvorApp API")
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

class AnnouncementReq(BaseModel):
    title: str
    body: str


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
    return {"app": "LouvorApp", "status": "ok"}


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
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)

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
    return serialize_user(target)

@api_router.delete("/ministry/members/{member_id}")
async def remove_member(member_id: str, leader: dict = Depends(require_leader)):
    if member_id == leader["_id"]:
        raise HTTPException(status_code=400, detail="Você não pode remover a si mesmo")
    target = await db.users.find_one({"_id": member_id, "ministry_id": leader["ministry_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    await db.users.delete_one({"_id": member_id})
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
async def create_song(req: SongReq, user: dict = Depends(require_perm(PERM_EDIT_SONGS))):
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
async def update_song(song_id: str, req: SongReq, user: dict = Depends(require_perm(PERM_EDIT_SONGS))):
    s = await db.songs.find_one({"_id": song_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Música não encontrada")
    updates = req.dict()
    await db.songs.update_one({"_id": song_id}, {"$set": updates})
    s.update(updates)
    return serialize_song(s)

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, user: dict = Depends(require_perm(PERM_EDIT_SONGS))):
    res = await db.songs.delete_one({"_id": song_id, "ministry_id": user["ministry_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Música não encontrada")
    return {"ok": True}


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
async def create_scale(req: ScaleReq, user: dict = Depends(require_perm(PERM_EDIT_SCALES))):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.scales.insert_one(scale)
    return serialize_scale(scale)

@api_router.put("/scales/{scale_id}")
async def update_scale(scale_id: str, req: ScaleReq, user: dict = Depends(require_perm(PERM_EDIT_SCALES))):
    s = await db.scales.find_one({"_id": scale_id, "ministry_id": user["ministry_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    updates = req.dict()
    await db.scales.update_one({"_id": scale_id}, {"$set": updates})
    s.update(updates)
    return serialize_scale(s)

@api_router.delete("/scales/{scale_id}")
async def delete_scale(scale_id: str, user: dict = Depends(require_perm(PERM_EDIT_SCALES))):
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
    return serialize_announcement(ann)

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


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
    await db.users.create_index("email", unique=True)
    await db.ministries.create_index("invite_code", unique=True)
    await db.ministries.create_index("api_key", unique=True)

@app.on_event("shutdown")
async def shutdown():
    client.close()
