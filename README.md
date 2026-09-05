# Rachna OS

Production architecture:
- `index.html` — application shell
- `app.js` — single frontend application
- `backend-clean.js` — single data/API layer
- `styles.css` — visual system
- `supabase/schema.sql` — database source

Legacy patch files are not part of production.

Date picker: BS year/month/day selection uses the canonical Nepali calendar configuration.