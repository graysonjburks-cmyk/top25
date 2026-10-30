# Validation results

Validated in this cloud machine with Node.js 24.19.0 and npm 11.9.0.

- Frozen install: `npm ci --no-audit --no-fund` passed with the workspace npm cache.
- SQL migrations: `npm run db:migrate` passed against the normal local PGlite database and were repeated successfully. Test databases were separate.
- Domain tests: **8 passed, 0 failed, 0 skipped**. AP scoring, duplicates/unknown teams, deterministic ties, week isolation, commissioner guard, agreement, 4/12/24 brackets/byes, automatic qualifiers, full-field scoring.
- API integration: **12 checks passed** against the production server with a disposable database. Covered group/session creation, cross-group authorization, commissioner permissions, private drafts, duplicate/incomplete rejection, submission status, voting close, ties/publication, archives, deadlines, independent formats, directory import/gate, full/conference fields, sourced metric import, removed member access, CSRF, and sign-out session revocation.
- Browser tests: **2 passed** using system Chromium, against both development and production modes. Covered public sample pages, CFP 4 and hypothetical 24, statistics filtering, museum panels, mobile group creation, draft persistence across reload, explicit bulk fill, final submission, voting close, publication, 25 rendered ranking rows and no document overflow at 390px.
- TypeScript checking and optimized Next.js build passed. Both SQL migration files were present in the deployment trace.
- Desktop and mobile screenshots were inspected. Fonts are served from bundled packages.

No live sports API, authoritative season verification, licensed historical/media collection, hosted PostgreSQL provider or public deployment was validated. NCAA/Wikipedia source requests returned HTTP 403. Full-field/conference functionality was tested with explicitly synthetic import fixtures, not claimed as verified sports data. Museum content panels correctly show unavailable/awaiting-content states when no sourced exhibits exist.

The environment draft stores tested installation and startup instructions. Draft persistence was confirmed; environment publication and validation in a newly restored task have not occurred. Source files remain reviewable in the repository working directory and have not been pushed.
