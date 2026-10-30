ALTER TABLE weeks ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS directory_season integer NOT NULL DEFAULT 2025;
CREATE TABLE IF NOT EXISTS season_directories (season integer PRIMARY KEY, teams jsonb NOT NULL, source text NOT NULL, verified_at timestamptz NOT NULL, notes text NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS metric_snapshots (id text PRIMARY KEY, season integer NOT NULL, week integer NOT NULL, metric text NOT NULL, source text NOT NULL, unit text NOT NULL, updated_at timestamptz NOT NULL, values_json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS team_exhibits (id text PRIMARY KEY, team_id text NOT NULL, category text NOT NULL, title text NOT NULL, body text NOT NULL, source text NOT NULL, rights text NOT NULL, media_url text, season integer);
ALTER TABLE weeks DROP CONSTRAINT IF EXISTS weeks_size_check;
ALTER TABLE weeks ADD CONSTRAINT weeks_size_check CHECK(size BETWEEN 2 AND 300);
UPDATE weeks SET mode='cfp12' WHERE mode='cfp' AND size=12 AND NOT EXISTS(SELECT 1 FROM weeks other WHERE other.group_id=weeks.group_id AND other.number=weeks.number AND other.mode='cfp12');
