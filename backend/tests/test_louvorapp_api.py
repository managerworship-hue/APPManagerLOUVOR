"""LouvorApp backend API tests - covers auth, ministry, songs, scales,
announcements, stats, external X-API-Key endpoints, multi-tenancy and
permission enforcement."""

import uuid
import requests


# -----------------------------
# Health
# -----------------------------
class TestHealth:
    def test_root(self, session, api):
        r = session.get(f"{api}/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"
        assert body.get("app") == "LouvorApp"


# -----------------------------
# Auth flows
# -----------------------------
class TestAuth:
    def test_signup_creates_leader_with_invite_and_api_key(self, leader_account):
        u = leader_account["user"]
        m = leader_account["ministry"]
        assert u["role"] == "leader"
        assert set(u["permissions"]) == {"edit_scales", "edit_songs", "edit_announcements"}
        assert len(m["invite_code"]) == 6 and m["invite_code"].isalnum() and m["invite_code"].isupper()
        assert m["api_key"] and m["api_key"].startswith("lvr_")

    def test_signup_member_via_invite_code(self, member_account, leader_account):
        u = member_account["user"]
        assert u["role"] == "member"
        assert u["permissions"] == []
        # belongs to leader's ministry
        assert u["ministry_id"] == leader_account["ministry"]["id"]
        # member must NOT see api_key
        assert member_account["ministry"].get("api_key") in (None, "")

    def test_signup_requires_ministry_or_invite(self, session, api):
        r = session.post(f"{api}/auth/signup", json={
            "name": "Anon User", "email": f"test_{uuid.uuid4().hex[:6]}@example.com", "password": "abcdef"
        })
        assert r.status_code == 400

    def test_signup_invalid_invite(self, session, api):
        r = session.post(f"{api}/auth/signup", json={
            "name": "Anon User", "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "password": "abcdef", "invite_code": "ZZZZZZ"
        })
        assert r.status_code == 404

    def test_signup_duplicate_email(self, session, api, leader_account):
        r = session.post(f"{api}/auth/signup", json={
            "name": "dup", "email": leader_account["email"],
            "password": "abcdef", "ministry_name": "x"
        })
        assert r.status_code == 400

    def test_login_success_and_me(self, session, api, leader_account):
        r = session.post(f"{api}/auth/login", json={
            "email": leader_account["email"], "password": leader_account["password"]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == leader_account["email"]
        assert data["ministry"]["api_key"]  # leader sees api key

        me = session.get(f"{api}/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        assert me.status_code == 200
        assert me.json()["id"] == data["user"]["id"]

    def test_update_avatar_success(self, session, api, leader_account):
        h = leader_account["headers"]
        # Verify default avatar
        r = session.get(f"{api}/auth/me", headers=h)
        assert r.status_code == 200
        assert r.json().get("avatar") == ""

        # Update avatar
        ru = session.put(f"{api}/auth/me", json={"avatar": "🎸"}, headers=h)
        assert ru.status_code == 200
        assert ru.json().get("avatar") == "🎸"

        # Verify persistence
        rg = session.get(f"{api}/auth/me", headers=h)
        assert rg.status_code == 200
        assert rg.json().get("avatar") == "🎸"

    def test_login_wrong_password(self, session, api, leader_account):
        r = session.post(f"{api}/auth/login", json={
            "email": leader_account["email"], "password": "wrong"
        })
        assert r.status_code == 401

    def test_me_requires_token(self, session, api):
        r = session.get(f"{api}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, session, api):
        r = session.get(f"{api}/auth/me", headers={"Authorization": "Bearer bad.token.value"})
        assert r.status_code == 401


# -----------------------------
# Ministry
# -----------------------------
class TestMinistry:
    def test_get_ministry_as_leader_includes_api_key(self, session, api, leader_account):
        r = session.get(f"{api}/ministry", headers=leader_account["headers"])
        assert r.status_code == 200
        body = r.json()
        assert body["api_key"] == leader_account["ministry"]["api_key"]

    def test_get_ministry_as_member_hides_api_key(self, session, api, member_account):
        r = session.get(f"{api}/ministry", headers=member_account["headers"])
        assert r.status_code == 200
        assert r.json().get("api_key") in (None, "")

    def test_list_members(self, session, api, leader_account, member_account):
        r = session.get(f"{api}/ministry/members", headers=leader_account["headers"])
        assert r.status_code == 200
        emails = [m["email"] for m in r.json()]
        assert leader_account["email"] in emails and member_account["email"] in emails

    def test_leader_can_grant_permission_to_member(self, session, api, leader_account, member_account):
        mid = member_account["user"]["id"]
        r = session.put(f"{api}/ministry/members/{mid}",
                        json={"permissions": ["edit_songs"]},
                        headers=leader_account["headers"])
        assert r.status_code == 200
        assert "edit_songs" in r.json()["permissions"]

    def test_member_cannot_update_members(self, session, api, member_account, leader_account):
        r = session.put(f"{api}/ministry/members/{leader_account['user']['id']}",
                        json={"role": "member"}, headers=member_account["headers"])
        assert r.status_code == 403

    def test_rotate_api_key_changes_value(self, session, api, leader_account):
        old = leader_account["ministry"]["api_key"]
        r = session.post(f"{api}/ministry/api-key/rotate", headers=leader_account["headers"])
        assert r.status_code == 200
        new = r.json()["api_key"]
        assert new and new != old
        leader_account["ministry"]["api_key"] = new  # update fixture for downstream tests

    def test_member_cannot_rotate_api_key(self, session, api, member_account):
        r = session.post(f"{api}/ministry/api-key/rotate", headers=member_account["headers"])
        assert r.status_code == 403


# -----------------------------
# Songs (CRUD + permission)
# -----------------------------
class TestSongs:
    def test_member_cannot_create_song(self, session, api, member_account):
        # Reset perms first (in case prior test granted edit_songs)
        # We use a fresh member by relying on the original perms (none).
        # If prior test added edit_songs, this could pass; therefore
        # we directly create another member to ensure clean state.
        pass

    def test_member_no_perm_cannot_create_song(self, session, api, leader_account):
        # create a brand-new member with no perms
        invite = leader_account["ministry"]["invite_code"]
        email = f"TEST_nopermmember_{uuid.uuid4().hex[:8]}@x.io"
        r = session.post(f"{api}/auth/signup", json={
            "name": "noperm", "email": email, "password": "abcdef", "invite_code": invite
        })
        assert r.status_code == 200
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        rs = session.post(f"{api}/songs", json={"title": "X"}, headers=h)
        assert rs.status_code == 403

    def test_leader_song_crud(self, session, api, leader_account):
        h = leader_account["headers"]
        payload = {"title": "TEST Song", "artist": "Banda", "key": "G", "bpm": 72,
                   "lyrics": "verso 1"}
        rc = session.post(f"{api}/songs", json=payload, headers=h)
        assert rc.status_code == 200
        sid = rc.json()["id"]
        # GET to verify persistence
        rg = session.get(f"{api}/songs/{sid}", headers=h)
        assert rg.status_code == 200
        assert rg.json()["title"] == "TEST Song"
        assert rg.json()["bpm"] == 72
        # update
        ru = session.put(f"{api}/songs/{sid}",
                         json={**payload, "title": "TEST Song 2", "bpm": 80},
                         headers=h)
        assert ru.status_code == 200 and ru.json()["title"] == "TEST Song 2"
        rg2 = session.get(f"{api}/songs/{sid}", headers=h)
        assert rg2.json()["bpm"] == 80
        # list
        rl = session.get(f"{api}/songs", headers=h)
        assert rl.status_code == 200
        assert any(s["id"] == sid for s in rl.json())
        # store id for later (scales / external)
        leader_account["song_id"] = sid

    def test_delete_song(self, session, api, leader_account):
        h = leader_account["headers"]
        rc = session.post(f"{api}/songs", json={"title": "TEST DeleteMe"}, headers=h)
        sid = rc.json()["id"]
        rd = session.delete(f"{api}/songs/{sid}", headers=h)
        assert rd.status_code == 200
        rg = session.get(f"{api}/songs/{sid}", headers=h)
        assert rg.status_code == 404


# -----------------------------
# Scales (CRUD + permission)
# -----------------------------
class TestScales:
    def test_leader_scale_crud(self, session, api, leader_account):
        h = leader_account["headers"]
        song_id = leader_account.get("song_id")
        payload = {
            "title": "TEST Culto",
            "date": "2099-12-25",
            "time": "19:00",
            "location": "Igreja",
            "notes": "ensaio antes",
            "song_ids": [song_id] if song_id else [],
            "musician_ids": [leader_account["user"]["id"]],
        }
        rc = session.post(f"{api}/scales", json=payload, headers=h)
        assert rc.status_code == 200
        scid = rc.json()["id"]
        leader_account["scale_id"] = scid
        rg = session.get(f"{api}/scales/{scid}", headers=h)
        assert rg.status_code == 200
        assert rg.json()["title"] == "TEST Culto"
        # update
        ru = session.put(f"{api}/scales/{scid}",
                         json={**payload, "title": "TEST Culto Atualizado"},
                         headers=h)
        assert ru.status_code == 200 and ru.json()["title"] == "TEST Culto Atualizado"

    def test_member_no_perm_cannot_create_scale(self, session, api, leader_account):
        invite = leader_account["ministry"]["invite_code"]
        email = f"TEST_nopermscale_{uuid.uuid4().hex[:8]}@x.io"
        r = session.post(f"{api}/auth/signup", json={
            "name": "noperm", "email": email, "password": "abcdef", "invite_code": invite
        })
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        rs = session.post(f"{api}/scales",
                          json={"title": "X", "date": "2099-01-01"}, headers=h)
        assert rs.status_code == 403


# -----------------------------
# Announcements
# -----------------------------
class TestAnnouncements:
    def test_leader_create_and_list(self, session, api, leader_account):
        h = leader_account["headers"]
        rc = session.post(f"{api}/announcements",
                          json={"title": "TEST Aviso", "body": "Olá"}, headers=h)
        assert rc.status_code == 200
        aid = rc.json()["id"]
        rl = session.get(f"{api}/announcements", headers=h)
        assert rl.status_code == 200
        assert any(a["id"] == aid for a in rl.json())
        # delete
        rd = session.delete(f"{api}/announcements/{aid}", headers=h)
        assert rd.status_code == 200

    def test_member_no_perm_cannot_create_announcement(self, session, api, leader_account):
        invite = leader_account["ministry"]["invite_code"]
        email = f"TEST_nopermann_{uuid.uuid4().hex[:8]}@x.io"
        r = session.post(f"{api}/auth/signup", json={
            "name": "np", "email": email, "password": "abcdef", "invite_code": invite
        })
        tok = r.json()["token"]
        h = {"Authorization": f"Bearer {tok}"}
        rs = session.post(f"{api}/announcements",
                          json={"title": "X", "body": "y"}, headers=h)
        assert rs.status_code == 403


# -----------------------------
# Stats
# -----------------------------
class TestStats:
    def test_stats_shape(self, session, api, leader_account):
        r = session.get(f"{api}/stats", headers=leader_account["headers"])
        assert r.status_code == 200
        body = r.json()
        for k in ("members", "songs", "scales", "announcements", "next_scale"):
            assert k in body
        assert body["members"] >= 1
        assert body["next_scale"] is None or body["next_scale"]["title"]


# -----------------------------
# Multi-tenancy isolation
# -----------------------------
class TestMultiTenancy:
    def test_other_ministry_cannot_see_data(self, session, api, leader_account, other_leader):
        # other leader sees its own (empty) songs list
        r = session.get(f"{api}/songs", headers=other_leader["headers"])
        assert r.status_code == 200
        for s in r.json():
            assert "TEST Song" not in s["title"]

    def test_other_ministry_cannot_access_song_by_id(self, session, api, leader_account, other_leader):
        sid = leader_account.get("song_id")
        if not sid:
            return
        r = session.get(f"{api}/songs/{sid}", headers=other_leader["headers"])
        assert r.status_code == 404

    def test_other_leader_cannot_update_foreign_member(self, session, api,
                                                       other_leader, member_account):
        r = session.put(f"{api}/ministry/members/{member_account['user']['id']}",
                        json={"role": "member"}, headers=other_leader["headers"])
        assert r.status_code == 404


# -----------------------------
# External API (X-API-Key)
# -----------------------------
class TestExternalAPI:
    def test_external_requires_key(self, session, api):
        r = session.get(f"{api}/external/ministry")
        assert r.status_code == 401

    def test_external_invalid_key(self, session, api):
        r = session.get(f"{api}/external/ministry", headers={"X-API-Key": "bad"})
        assert r.status_code == 401

    def test_external_ministry(self, session, api, leader_account):
        key = leader_account["ministry"]["api_key"]
        r = session.get(f"{api}/external/ministry", headers={"X-API-Key": key})
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == leader_account["ministry"]["id"]
        assert body["name"]

    def test_external_songs(self, session, api, leader_account):
        key = leader_account["ministry"]["api_key"]
        r = session.get(f"{api}/external/songs", headers={"X-API-Key": key})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_external_scales_upcoming_with_setlist_bpm(self, session, api, leader_account):
        key = leader_account["ministry"]["api_key"]
        r = session.get(f"{api}/external/scales?upcoming=true",
                        headers={"X-API-Key": key})
        assert r.status_code == 200
        scales = r.json()
        assert isinstance(scales, list)
        if scales:
            sc = scales[0]
            assert "setlist" in sc
            if sc["setlist"]:
                song = sc["setlist"][0]
                assert "bpm" in song
                # lyrics should NOT be in list endpoint
                assert "lyrics" not in song

    def test_external_scale_detail_includes_lyrics(self, session, api, leader_account):
        scid = leader_account.get("scale_id")
        key = leader_account["ministry"]["api_key"]
        if not scid:
            return
        r = session.get(f"{api}/external/scales/{scid}", headers={"X-API-Key": key})
        assert r.status_code == 200
        body = r.json()
        assert "setlist" in body
        if body["setlist"]:
            assert "lyrics" in body["setlist"][0]
