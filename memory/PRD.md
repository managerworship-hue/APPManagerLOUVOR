# LouvorApp - Product Requirements

## Overview
Mobile app for worship ministry management. Helps churches organize their music team, manage schedules (escalas), repertoire (músicas), members and internal announcements.

## Stack
- **Frontend**: Expo SDK 54 + expo-router + React Native (TypeScript)
- **Backend**: FastAPI + Motor (MongoDB async)
- **Auth**: JWT (HS256) + bcrypt password hashing
- **Storage**: AsyncStorage / SecureStore via `@/src/utils/storage`

## Design System
- Theme: Light only, premium/refined aesthetic
- Palette: bone-white #F9F9F8, deep navy #1A2B4C, muted gold #C5A059
- Bottom tab navigation: Início · Escalas · Repertório · Perfil

## Core Features
1. **Auth (JWT)** - Login + Register (create ministry OR join via 6-char invite code)
2. **Multi-tenant** - Each user belongs to a single Ministry; data is scoped per ministry
3. **Role-based permissions**:
   - Leader: full access, can promote/demote, manage permissions, rotate API key
   - Member with permissions: `edit_scales`, `edit_songs`, `edit_announcements`
   - Member without permissions: view-only
4. **Dashboard** - greeting, next scale hero card, stats grid (members/songs/scales/announcements), recent announcements
5. **Escalas (Scales)** - List + create + detail (date, time, location, notes, setlist, musicians)
6. **Repertório (Songs)** - List + search + create + detail (title, artist, key, BPM, YouTube, Cifra, lyrics)
7. **Membros** - List of members with avatar, role badge, permissions toggles (leader only)
8. **Convidar** - Share invite code via WhatsApp or system share
9. **Avisos** - Internal announcements with author + timestamp
10. **API externa** - X-API-Key authenticated endpoints for external PWA integration:
    - `GET /api/external/ministry` - basic info
    - `GET /api/external/songs` - all songs
    - `GET /api/external/scales?upcoming=true&limit=50` - scales with hydrated setlist
    - `GET /api/external/scales/{id}` - single scale with full setlist
    - Leader can rotate the API key from the Integração screen

## Backend Models (MongoDB)
- `ministries`: _id (uuid), name, invite_code (unique), api_key (unique)
- `users`: _id (uuid), name, email (unique), password_hash, ministry_id, role, permissions[], instruments[]
- `songs`: _id, ministry_id, title, artist, key, bpm, youtube_url, cifra_url, lyrics
- `scales`: _id, ministry_id, title, date (ISO), time, location, notes, song_ids[], musician_ids[]
- `announcements`: _id, ministry_id, title, body, author_id, author_name, created_at

## Endpoints (auth via Bearer JWT)
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me`
- `GET /api/ministry`, `GET /api/ministry/members`, `PUT /api/ministry/members/{id}`, `DELETE /api/ministry/members/{id}`
- `POST /api/ministry/api-key/rotate` (leader only)
- `GET/POST/PUT/DELETE /api/songs[/{id}]` (requires `edit_songs` or leader)
- `GET/POST/PUT/DELETE /api/scales[/{id}]` (requires `edit_scales` or leader)
- `GET/POST/DELETE /api/announcements[/{id}]` (requires `edit_announcements` or leader; author can delete own)
- `GET /api/stats`
- External: `/api/external/*` (X-API-Key header)
