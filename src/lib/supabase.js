import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('elo', { ascending: false })
  if (error) throw error
  return data
}

export async function addPlayer({ first_name, last_name, nickname, is_guest = false }) {
  const name = [first_name, nickname ? `"${nickname}"` : null, last_name].filter(Boolean).join(' ')
  const { data, error } = await supabase
    .from('players')
    .insert({ name, first_name, last_name: last_name || null, nickname: nickname || null, is_guest, elo: 1000, wins: 0, losses: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePlayer(id, { first_name, last_name, nickname }) {
  const name = [first_name, nickname ? `"${nickname}"` : null, last_name].filter(Boolean).join(' ')
  const { error } = await supabase
    .from('players')
    .update({ name, first_name, last_name: last_name || null, nickname: nickname || null })
    .eq('id', id)
  if (error) throw error
}

export async function uploadPhoto(playerId, file) {
  const ext = file.name.split('.').pop()
  const path = `${playerId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('player-photos')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  const photoUrl = data.publicUrl + '?t=' + Date.now()
  const { error } = await supabase.from('players').update({ photo_url: photoUrl }).eq('id', playerId)
  if (error) throw error
}

export async function deletePlayer(id) {
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw error
}

export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function deleteLastMatch(players) {
  // Récupère le dernier match
  const { data: matches, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
  if (fetchErr) throw fetchErr
  if (!matches || matches.length === 0) throw new Error('Aucun match à supprimer')

  const match = matches[0]

  // Inverse les deltas pour rétablir les ELO
  const updates = []
  if (!match.has_guest) {
    for (const id of (match.team_a || [])) {
      if (id === '__guest__') continue
      const p = players.find(p => p.id === id)
      if (!p) continue
      updates.push(supabase.from('players').update({
        elo: p.elo - match.delta_a,
        wins: match.winner === 'A' ? Math.max(0, p.wins - 1) : p.wins,
        losses: match.winner === 'B' ? Math.max(0, p.losses - 1) : p.losses,
      }).eq('id', id))
    }
    for (const id of (match.team_b || [])) {
      if (id === '__guest__') continue
      const p = players.find(p => p.id === id)
      if (!p) continue
      updates.push(supabase.from('players').update({
        elo: p.elo - match.delta_b,
        wins: match.winner === 'B' ? Math.max(0, p.wins - 1) : p.wins,
        losses: match.winner === 'A' ? Math.max(0, p.losses - 1) : p.losses,
      }).eq('id', id))
    }
    await Promise.all(updates)
  }

  // Supprime le match
  const { error: delErr } = await supabase.from('matches').delete().eq('id', match.id)
  if (delErr) throw delErr

  return match
}

export async function getSeasons() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false })
  if (error) throw error
  return data
}

const K = 40
const BEER_BONUS = 10

export async function submitMatch({ teamA, teamB, winnerTeam, beerBonus, players }) {
  // Si un invité est dans l'une des équipes, aucun ELO ne bouge
  const allIds = [...teamA, ...teamB]
  const hasGuest = allIds.some(id => players.find(p => p.id === id)?.is_guest)

  let deltaA = 0
  let deltaB = 0

  if (!hasGuest) {
    const avg = ids => ids.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / ids.length
    const expA = 1 / (1 + Math.pow(10, (avg(teamB) - avg(teamA)) / 400))
    const sa = winnerTeam === 'A' ? 1 : 0
    deltaA = Math.round(K * (sa - expA))
    deltaB = Math.round(K * ((1 - sa) - (1 - expA)))
    if (beerBonus) {
      if (winnerTeam === 'A') deltaA += BEER_BONUS
      else deltaB += BEER_BONUS
    }
  }

  const { error: matchError } = await supabase.from('matches').insert({
    team_a: teamA, team_b: teamB,
    winner: winnerTeam,
    beer_bonus: beerBonus,
    has_guest: hasGuest,
    delta_a: deltaA, delta_b: deltaB,
  })
  if (matchError) throw matchError

  if (!hasGuest) {
    const updates = []
    for (const id of teamA) {
      const p = players.find(p => p.id === id)
      updates.push(supabase.from('players').update({
        elo: p.elo + deltaA,
        wins: winnerTeam === 'A' ? p.wins + 1 : p.wins,
        losses: winnerTeam === 'B' ? p.losses + 1 : p.losses,
      }).eq('id', id))
    }
    for (const id of teamB) {
      const p = players.find(p => p.id === id)
      updates.push(supabase.from('players').update({
        elo: p.elo + deltaB,
        wins: winnerTeam === 'B' ? p.wins + 1 : p.wins,
        losses: winnerTeam === 'A' ? p.losses + 1 : p.losses,
      }).eq('id', id))
    }
    await Promise.all(updates)
  }

  return { deltaA, deltaB, hasGuest }
}

export async function archiveSeason(year, players) {
  const ranked = players.filter(p => !p.is_guest)
  const snapshot = ranked.map(p => ({
    id: p.id, name: p.name, first_name: p.first_name,
    last_name: p.last_name, nickname: p.nickname,
    elo: p.elo, wins: p.wins, losses: p.losses,
  }))
  const { error } = await supabase.from('seasons').insert({
    year, snapshot,
    champion_id: ranked[0]?.id,
    champion_name: ranked[0]?.name,
    champion_elo: ranked[0]?.elo,
  })
  if (error) throw error
  const resets = ranked.map(p =>
    supabase.from('players').update({ elo: 1000, wins: 0, losses: 0 }).eq('id', p.id)
  )
  await Promise.all(resets)
}
