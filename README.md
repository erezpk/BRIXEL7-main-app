# BRIXEL7 main app

## Quick start

1. Create `.env` in the project root with:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/brixel_db
SESSION_SECRET=change-me
# For emails (optional but recommended)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your-app-password
# Public base URL for links in emails (optional)
BASE_URL=http://localhost:5000
```

2. Start dev server

Windows PowerShell:

```
$env:SKIP_AUTH="true"; npm run dev
```

3. Open http://localhost:5000

## Notes

- Local auth uses email+password with sessions.
- Forgot password will log the reset link in the server console even if email is not configured.

