# VaaniBill

VaaniBill is a web-based billing app for shopkeepers. It supports product management, voice-based billing, and printable/downloadable bills.

## Features

- Signup/login with business name
- Product master (name, rate) with edit/delete
- Voice billing with speech-to-text
- Bill download as PDF and print
- Light/dark theme toggle
- Reports, settings, and help pages

## Tech stack

- React + Vite
- Express (API)
- SQLite database (data/vaanibill.db)

## Getting started

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API server: http://localhost:5174

## Notes

- Data is stored locally in `data/vaanibill.db`.
- For custom JWT secret, set `JWT_SECRET` before running the server.
- Speech recognition works best in Chromium-based browsers.
