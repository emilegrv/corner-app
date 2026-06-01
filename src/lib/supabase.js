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

export async function addPlayer({ first_name, last_name, nickname }) {
  const name = [first_name, nickname ? `"${nickname}"` : null, last_name].filter(Boolean).join(' ')
  const { data, error } = await supabase
    .from('players')
    .insert({ name, first_name, last_name: last_name || null, nickname: nickname || null, elo: 1000, wins: 0, losses: 0 })
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
    .limit(50)
  if (error) throw error
  return data
}

export async function submitMatch({ teamA, teamB, scoreA, scoreB, players }) {
  const avgA = teamA.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / 3
  const avgB = teamB.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / 3
  const K = 32
  const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400))
  const sa = scoreA > scoreB ? 1 : 0
  const deltaA = Math.round(K * (sa - expA))
  const deltaB = Math.round(K * ((1 - sa) - (1 - expA)))

  const { error: matchError } = await supabase.from('matches').insert({
    team_a: teamA, team_b: teamB,
    score_a: scoreA, score_b: scoreB,
    delta_a: deltaA, delta_b: deltaB,
  })
  if (matchError) throw matchError

  const updates = []
  for (const id of teamA) {
    const p = players.find(p => p.id === id)
    updates.push(supabase.from('players').update({
      elo: p.elo + deltaA,
      wins: scoreA > scoreB ? p.wins + 1 : p.wins,
      losses: scoreA < scoreB ? p.losses + 1 : p.losses,
    }).eq('id', id))
  }
  for (const id of teamB) {
    const p = players.find(p => p.id === id)
    updates.push(supabase.from('players').update({
      elo: p.elo + deltaB,
      wins: scoreB > scoreA ? p.wins + 1 : p.wins,
      losses: scoreB < scoreA ? p.losses + 1 : p.losses,
    }).eq('id', id))
  }
  await Promise.all(updates)
  return { deltaA, deltaB }
}
