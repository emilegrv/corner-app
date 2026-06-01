-- CORNER APP v2 — Supabase SQL Schema

CREATE TABLE players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  first_name  text,
  last_name   text,
  nickname    text,
  photo_url   text,
  elo         integer NOT NULL DEFAULT 1000,
  wins        integer NOT NULL DEFAULT 0,
  losses      integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a     uuid[] NOT NULL,
  team_b     uuid[] NOT NULL,
  score_a    integer NOT NULL,
  score_b    integer NOT NULL,
  delta_a    integer NOT NULL,
  delta_b    integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON matches  FOR ALL USING (true) WITH CHECK (true);

-- STORAGE (à faire dans le dashboard Supabase > Storage) :
-- 1. Créer un bucket "player-photos" en mode Public
-- 2. Ajouter une policy "Allow all" pour INSERT/SELECT/UPDATE/DELETE
