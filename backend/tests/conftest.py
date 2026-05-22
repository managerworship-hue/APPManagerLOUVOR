import os
import pytest
import requests
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get the public backend URL
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api():
    return API


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _rand_email(prefix="testleader"):
    return f"test_{prefix}_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="session")
def leader_account(session):
    """Create a fresh leader (creates a new ministry)."""
    email = _rand_email("leader")
    payload = {
        "name": "TEST Leader",
        "email": email,
        "password": "leaderpass1",
        "ministry_name": "TEST_Ministry_" + uuid.uuid4().hex[:6],
    }
    r = session.post(f"{API}/auth/signup", json=payload)
    assert r.status_code == 200, f"Leader signup failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": payload["password"],
        "token": data["token"],
        "user": data["user"],
        "ministry": data["ministry"],
        "headers": {"Authorization": f"Bearer {data['token']}"},
    }


@pytest.fixture(scope="session")
def member_account(session, leader_account):
    """Member that joins the leader's ministry via invite_code."""
    invite = leader_account["ministry"]["invite_code"]
    email = _rand_email("member")
    payload = {
        "name": "TEST Member",
        "email": email,
        "password": "memberpass1",
        "invite_code": invite,
    }
    r = session.post(f"{API}/auth/signup", json=payload)
    assert r.status_code == 200, f"Member signup failed: {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": payload["password"],
        "token": data["token"],
        "user": data["user"],
        "ministry": data["ministry"],
        "headers": {"Authorization": f"Bearer {data['token']}"},
    }


@pytest.fixture(scope="session")
def other_leader(session):
    """A different ministry leader to test multi-tenancy isolation."""
    email = _rand_email("otherleader")
    payload = {
        "name": "TEST Other Leader",
        "email": email,
        "password": "otherpass1",
        "ministry_name": "TEST_Other_" + uuid.uuid4().hex[:6],
    }
    r = session.post(f"{API}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "token": data["token"],
        "user": data["user"],
        "ministry": data["ministry"],
        "headers": {"Authorization": f"Bearer {data['token']}"},
    }
