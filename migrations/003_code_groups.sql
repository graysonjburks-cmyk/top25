ALTER TABLE groups ADD COLUMN IF NOT EXISTS code_hash text UNIQUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS auto_results boolean NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS appearance jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS submission_limits (key text PRIMARY KEY, attempts integer NOT NULL, resets_at timestamptz NOT NULL);
