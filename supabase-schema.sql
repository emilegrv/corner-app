-- CORNER APP v6 — Nouvelles tables à ajouter

-- Table des évènements
CREATE TABLE IF NOT EXISTS events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL, -- 'ACP 250', 'ACP 500', 'ACP 1000', 'WST'
  description  text,
  photo_url    text,
  status       text NOT NULL DEFAULT 'ongoing', -- 'ongoing' | 'closed'
  participants uuid[] DEFAULT '{}',
  standings    jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON events FOR ALL USING (true) WITH CHECK (true);

-- Lier les matchs à un évènement (optionnel)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id);
