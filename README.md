# Sanglich — Corner App v2

## Changements v2
- Nouveau design : cartes joueurs style sport (top 3 en grandes cartes, podium)
- Photos de profil uploadables par chaque joueur
- Prénom / Nom / Surnom séparés (surnom entre guillemets)
- Fonctionnalité "C'est moi" — chaque joueur choisit son profil sur son téléphone

## Déploiement

### 1. Supabase
1. Va sur https://supabase.com → nouveau projet
2. SQL Editor → colle supabase-schema.sql → Run
3. Storage → "New bucket" → nom: `player-photos` → coche "Public" → Create
4. Dans le bucket player-photos → Policies → New policy → "Full access" pour tous
5. Settings → General → note le Reference ID (ton URL = https://[ID].supabase.co)
6. Settings → API Keys → note la clé sb_publishable_...

### 2. Vercel
1. Push ce dossier sur GitHub
2. Importe sur vercel.com
3. Variables d'environnement :
   - VITE_SUPABASE_URL = https://[ton-id].supabase.co
   - VITE_SUPABASE_ANON_KEY = sb_publishable_...
4. Deploy !

## Migration depuis v1
Si tu avais déjà des joueurs en base, il faut ajouter les colonnes :
```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url text;
```
