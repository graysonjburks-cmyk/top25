# Saturday Poll

Private college football polling for friends. Standalone Next.js 15 / React 19 / TypeScript application with PostgreSQL SQL migrations, typed domain modules, and a locally bundled editorial font system. No connection to Launch Studio. No paid sports API is required.

## Run locally

Node.js 24 is tested. From `/workspace/top25`:

```sh
npm ci --cache /workspace/.npm-cache
npm run db:migrate
npm run dev
```

The application listens on port 3000. Without `DATABASE_URL`, PGlite runs genuine PostgreSQL locally and persists data under `.data/poll`. Keep **one application process per local database directory**. Stop that process before running standalone migration commands against the same directory. PostgreSQL is used through `pg` when `DATABASE_URL` is set. Never run an ephemeral PGlite database on Vercel.

The signed-out homepage is a read-only demonstration using explicitly marked sample ballot fixtures. It contains no live rankings, scores, records, schedules, or results. Create a group to start with real, empty ballots. The local demo needs no credentials.

## Primary workflow

1. Create a private group, choose the season, and enter your name. Week 1 of Top 25 opens automatically.
2. In Group settings, generate a private invitation and share it securely. Generating another invitation invalidates previous links; existing members keep access.
3. Friends follow the link and choose names. Each gets a random, persistent, HTTP-only browser session. Names do not authenticate returning users.
4. Select a format. Build a ballot using search, conference filters, drag handles, accessible arrows, direct rank entry, or **Fill remaining alphabetically**. Bulk filling is an explicit user action, never an automatic ballot change. Save partial drafts or submit exactly the required number of unique teams.
5. The commissioner sets a deadline, sees submission status, closes voting, then publishes. Draft contents and unpublished individual ballots are private. Final ballots remain editable until the deadline or close. Saving a submitted ballot as a draft removes it from aggregation until resubmitted.
6. View consensus, first-place votes, movement, high/low ranks, agreement, individual published ballots, history and CSV export. Unpublishing returns results to closed voting.

AP scoring is N points for rank 1 through 1 point for rank N (N=25 for AP Top 25). Equal points are marked `T`; first-place votes, then English alphabetical team names break ties deterministically. Unranked teams receive zero points and rank N+1 for disagreement statistics. Only active members' final ballots count when publication is created. Published snapshots remain intact after later removals. Published results require unpublishing before changing voting status.

### Independent formats

AP Top 25, CFP 4, CFP 12, and **hypothetical CFP 24** have separate weekly numbering, ballots, settings and publications. Additional formats support full FBS, custom Top N and conference-only ballots. Archives retain format identity.

Playoff projections use independent seed ballots, not AP ballots. Choose consensus or an individual's published bracket. Single elimination uses the next power-of-two bracket: four teams have no byes, 12 have four, 24 have eight. Settings support balanced or adjacent seed placement and named automatic qualifiers. Automatic qualifiers must have appeared on a submitted seed ballot; they replace the lowest consensus non-qualifier in the selected field. The UI explains this adjustment; original ballots and point totals never change. Later-round entrants remain unknown, not fabricated winners. Season-specific rules are stored with each polling week. Conference championship qualification must currently be entered by the commissioner; no external championship feed is configured.

### Season directory

The bundled **2025 offline reference directory is explicitly unverified**, not a claim about the current season. Its count is derived from its entries. It is not hardcoded to 138. Full-field and conference polls require a commissioner-imported, verified directory for the group's selected season. Normal Top 25 and playoff testing can use the labeled reference directory. New polling weeks retain their eligible team snapshot, so later directory imports do not silently change an existing ballot's universe.

NCAA and Wikipedia source requests returned HTTP 403 in this environment. No current-season membership verification is claimed. Review membership and transitioning programs against authoritative NCAA/conference sources, then import season JSON in Group settings. No scraping is implemented.

```json
{
  "season": 2026,
  "source": "https://www.ncaa.org/sports/2021/5/3/membership-directory.aspx",
  "verifiedAt": "2026-10-01T00:00:00Z",
  "notes": "Describe verification method, transitioning programs and season boundaries",
  "teams": [
    {
      "id": "georgia",
      "name": "Georgia",
      "conference": "SEC",
      "initials": "G",
      "color": "#b71936"
    }
  ]
}
```

The example illustrates the schema; supply the **complete verified field**, not the single example entry. Import metadata is an attestation by the commissioner, not automated verification of the URL. Team IDs must stay stable across seasons. Do not import sports data you lack permission to use.

### Statistics adapter

The Data center searches the full loaded directory, sorts all numeric columns and team names, lets voters choose columns, and compares published group ranks with imported external metrics. Every available metric displays source, season, week, unit and last update. “Latest” uses each metric's latest source week; different source weeks are explicitly displayed. Missing values sort last and remain unavailable.

Supported keys: `ap`, `coaches`, `cfp`, `fpi`, `sos`, `sor`, `offense`, `defense`, `scoringOffense`, `scoringDefense`, `passingOffense`, `passingDefense`, `rushingOffense`, `rushingDefense`, `turnovers`, `offensiveEfficiency`, `defensiveEfficiency`, `wins`, `losses`, `conferenceWins`, `conferenceLosses`. Imported conference wins/losses support a sortable conference standings view through those columns. No live sports adapter or API credentials are bundled. ESPN proprietary metrics remain unavailable unless a licensed snapshot is supplied; group Borda rank is the clearly labeled alternative ranking, not an imitation of FPI or SOR.

Commissioner JSON import:

```json
{
  "season": 2026,
  "week": 8,
  "metric": "wins",
  "unit": "games",
  "source": "https://YOUR-LICENSED-SOURCE.example/data",
  "updatedAt": "2026-10-01T00:00:00Z",
  "values": { "georgia": 0 }
}
```

This is a format example, **not factual sports data**. Only import actual source values and timestamps. The adapter imports JSON snapshots without making arbitrary server-side URL requests. It does not require a secret. A future live provider should bind its credentials securely on the server and honor provider licensing, quotas, cache and attribution requirements.

### Team museums and optional gamification

Every team badge or name in the Data center opens its program cabinet. Cabinets separate identity, stadium/campus, football history, people and memorabilia. Directory trivia, optional local collectible program badges, optional synthesized selection tones, and weekly participation scorecards work without licensed media. No copyrighted logos, archival photographs, music or historical achievements are invented. Fonts are bundled under their upstream OFL licenses in the installed font packages; text badges are original.

Museum cabinets initially display a truthful empty state for sourced content. Commissioners can import exhibits with this schema:

```json
{
  "teamId": "georgia",
  "category": "history",
  "title": "Exhibit title",
  "body": "Verified historical text",
  "source": "https://AUTHORITATIVE-SOURCE.example/exhibit",
  "rights": "Document license or permission, attribution and expiry",
  "mediaUrl": "https://LICENSED-MEDIA.example/item",
  "season": 2026
}
```

Categories: `identity`, `stadium`, `history`, `people`, `memorabilia`. Media opens as an attributed external link; it is not copied or embedded. Timelines, head-to-head history, historical logos, rich licensed imagery, real trivia banks and detailed player collections require sourced datasets and remain future work. Collection badges are browser-local and optional. Scorecards reward submission, never team choices.

## Database & security

`migrations/001_initial.sql` establishes groups, members, independent weeks, ballots and immutable-at-publication snapshots. `002_expansion.sql` additively introduces settings, season directories, metric snapshots, exhibits and larger fields. Both scripts are idempotent. Existing groups, ballots and published data are preserved. Application writes are transactional. Week mutations lock the week row; ballot SQL also checks open status and deadline at write time. The browser cannot write another member's ballot. Session and invitation tokens are 256-bit random values stored as SHA-256 hashes; raw tokens do not enter database records. Session cookies are HTTP-only, SameSite Lax, 180 days, and Secure in production. Cross-origin mutations are rejected. Creation/join rate limiting is process-local.

**Operational limitations:** no password/account recovery or cross-device identity transfer yet. Clearing cookies loses that browser identity; rejoining creates a new member, not an identity claim by name. Commissioners should remove abandoned identities. Invitation holders can join until the link is rotated. In-process rate limits need a shared store before scaling. Reference datasets and curated exhibits are shared installation-wide; only private group data and ballots are group-scoped. Never enter private information into globally shared exhibit text or sports snapshots.

## Validation

```sh
npm test                 # scoring, duplicates, ties, week isolation, brackets, full-field scoring
npm run typecheck
npm run build
# Start the app against a disposable DB before integration/browser tests:
LOCAL_DB_PATH=/tmp/saturday-poll-test-db npm run dev
npm run test:integration
npm run test:browser
```

Browser tests use installed Chromium at `/usr/bin/chromium` or `CHROMIUM_PATH`. The container has Chromium; no browser download is needed. Tests create fictional groups and source fixtures in the selected test DB. Do not run these mutation tests against a production database. The integration fixture's directory verification marker is explicitly test-only and is not evidence of verified sports membership. Tests preserve the underlying command exit status.

## Deployment (not yet deployed)

1. Create a **separate** Vercel project and a dedicated PostgreSQL database (for example Neon or Supabase), with its own access controls. This repository does not provision or reuse another product's database.
2. Set `DATABASE_URL` in the deployment provider's secure environment settings using the provider's TLS-verified PostgreSQL connection string. Never commit it. Follow the provider's connection pooling and CA documentation; do not disable TLS verification.
3. Apply `npm run db:migrate` against that database before starting traffic. Build with `npm run build`, run with `npm start`; Vercel uses its Next.js integration. SQL files must remain in the deployment bundle. Add any provider-required runtime assets to the bundle if using a different bundler.
4. Use HTTPS. Do not expose PGlite data files. Configure shared rate limiting before multi-instance deployment, backups, monitoring, a recovery flow and a retention policy before relying on this for a season.
5. Verify creation, invitation on a second browser, persistence after redeploy, submission, close, publication and cross-group isolation on the actual domain. A local build does not establish successful deployment.

Environment variables: `DATABASE_URL` (optional locally, required in hosted/multi-instance production), `LOCAL_DB_PATH` (optional local storage path), `CHROMIUM_PATH` (tests only), `SMOKE_URL` (integration test base URL). No API key is needed. Sports content and membership verification remain separate prerequisites for a populated live statistics/museum experience.

See [REQUIREMENTS.md](REQUIREMENTS.md) for the implementation audit and remaining work.

## Vercel deployment configuration

`vercel.json` runs a database configuration preflight, applies SQL migrations to the production PostgreSQL database, then builds Next.js. Set `DATABASE_URL` in the Vercel project's Production environment before the first deployment. The build fails if that setting is absent or is not a PostgreSQL URL. Hosted runtime also refuses local database fallback, so ballots cannot silently be stored on ephemeral function storage. `.vercelignore` excludes local databases, credentials, dependencies and generated output from upload.

Deployment from this cloud machine currently needs Vercel authentication and network access to `api.vercel.com`, `vercel.com`, and `auth.vercel.com`. The CLI is installed in the workspace npm cache and its writable global config location is `/workspace/.deployment-tools/vercel`. No account is authenticated. The saved environment draft declares `VERCEL_TOKEN` for secure entry and includes the required Vercel domains; it must be reviewed/saved and published before those settings are active. Do not put tokens or database connection strings in chat or source files. A production database URL belongs in Vercel's secure project environment settings.

No public deployment has been created or verified.
