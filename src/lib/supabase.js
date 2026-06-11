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
  if (error) throw error
  return data
}

export async function deleteLastMatch(players) {
  const { data: matches, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
  if (fetchErr) throw fetchErr
  if (!matches || matches.length === 0) throw new Error('Aucun match à supprimer')

  const match = matches[0]
  const updates = []
  // Toujours rétablir l'ELO des joueurs réguliers (même si le match avait un invité)
  if (match.delta_a !== 0 || match.delta_b !== 0) {
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
  }
  if (updates.length > 0) await Promise.all(updates)
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

export async function submitMatch({ teamA, teamB, winnerTeam, beerBonus, players, scoreA, scoreB, eventId }) {
  const allIds = [...teamA, ...teamB]
  const hasGuest = allIds.some(id => id === '__guest__' || players.find(p => p.id === id)?.is_guest)

  // Filtrer __guest__ pour le stockage UUID[] en DB
  const teamAClean = teamA.filter(id => id !== '__guest__')
  const teamBClean = teamB.filter(id => id !== '__guest__')

  // Calculer les deltas ELO en ignorant les invités dans la moyenne
  const realTeamA = teamA.filter(id => id !== '__guest__' && players.find(p => p.id === id && !p.is_guest))
  const realTeamB = teamB.filter(id => id !== '__guest__' && players.find(p => p.id === id && !p.is_guest))

  let deltaA = 0
  let deltaB = 0

  if (realTeamA.length > 0 && realTeamB.length > 0) {
    const avg = ids => ids.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / ids.length
    const expA = 1 / (1 + Math.pow(10, (avg(realTeamB) - avg(realTeamA)) / 400))
    const sa = winnerTeam === 'A' ? 1 : 0
    deltaA = Math.round(K * (sa - expA))
    deltaB = Math.round(K * ((1 - sa) - (1 - expA)))
    if (beerBonus) {
      if (winnerTeam === 'A') deltaA += BEER_BONUS
      else deltaB += BEER_BONUS
    }
  }

  const { error: matchError } = await supabase.from('matches').insert({
    team_a: teamAClean,
    team_b: teamBClean,
    winner: winnerTeam,
    beer_bonus: beerBonus,
    has_guest: hasGuest,
    delta_a: deltaA,
    delta_b: deltaB,
    event_id: eventId || null,
  })
  if (matchError) throw matchError

  // Mettre à jour l'ELO des joueurs réguliers uniquement
  const updates = []
  for (const id of realTeamA) {
    const p = players.find(p => p.id === id)
    if (!p) continue
    updates.push(supabase.from('players').update({
      elo: p.elo + deltaA,
      wins: winnerTeam === 'A' ? p.wins + 1 : p.wins,
      losses: winnerTeam === 'B' ? p.losses + 1 : p.losses,
    }).eq('id', id))
  }
  for (const id of realTeamB) {
    const p = players.find(p => p.id === id)
    if (!p) continue
    updates.push(supabase.from('players').update({
      elo: p.elo + deltaB,
      wins: winnerTeam === 'B' ? p.wins + 1 : p.wins,
      losses: winnerTeam === 'A' ? p.losses + 1 : p.losses,
    }).eq('id', id))
  }
  await Promise.all(updates)

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

// ── Events ────────────────────────────────────────────────

const EVENT_POINTS = {
  'ACP 250':  [25, 15, 10],
  'ACP 500':  [45, 35, 30],
  'ACP 1000': [65, 55, 50],
  'WST':      [100, 75, 50],
}

export { EVENT_POINTS }

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEvent({ name, type, description, photo_url, date }) {
  const { data, error } = await supabase
    .from('events')
    .insert({ name, type, description: description || null, photo_url: photo_url || null, date: date || null, status: 'ongoing', participants: [], standings: [] })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEventParticipants(eventId, participants) {
  const { error } = await supabase
    .from('events')
    .update({ participants })
    .eq('id', eventId)
  if (error) throw error
}

export async function updateEvent(id, { name, type, description, date }) {
  const { error } = await supabase
    .from('events')
    .update({ name, type, description: description || null, date: date || null })
    .eq('id', id)
  if (error) throw error
}

export async function uploadEventPhoto(eventId, file) {
  const ext = file.name.split('.').pop()
  const path = `event-${eventId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('player-photos')
    .upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  const photoUrl = data.publicUrl + '?t=' + Date.now()
  const { error } = await supabase.from('events').update({ photo_url: photoUrl }).eq('id', eventId)
  if (error) throw error
  return photoUrl
}

export async function deleteEvent(event, players) {
  if (event.status === 'closed' && event.standings && event.standings.length > 0) {
    const points = EVENT_POINTS[event.type] || [25, 15, 10]
    const updates = []
    let i = 0
    const standings = event.standings
    while (i < Math.min(standings.length, 3)) {
      const currentWins = standings[i]?.wins || 0
      const tied = standings.filter((s, idx) => idx >= i && idx < 3 && (s?.wins || 0) === currentWins)
      const startIdx = i
      const endIdx = Math.min(startIdx + tied.length - 1, 2)
      const totalPts = points.slice(startIdx, endIdx + 1).reduce((s, p) => s + p, 0)
      const sharedPts = Math.round(totalPts / tied.length)
      tied.forEach(s => {
        const p = players.find(pl => pl.id === s.id)
        if (p && sharedPts > 0) {
          updates.push(supabase.from('players').update({ elo: Math.max(0, p.elo - sharedPts) }).eq('id', s.id))
        }
      })
      i += tied.length
    }
    await Promise.all(updates)
  }

  // Délier les matchs associés avant de supprimer
  await supabase.from('matches').update({ event_id: null }).eq('event_id', event.id)

  // Supprimer l'évènement
  const { error } = await supabase.from('events').delete().eq('id', event.id)
  if (error) throw error
}

export async function closeEvent(event, players) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', event.id)

  const stats = {}
  const participants = event.participants || []
  // Initialiser tous les participants actuels
  participants.forEach(id => { stats[id] = { wins: 0, losses: 0 } })
  // Initialiser aussi les joueurs retirés qui ont quand même joué des matchs
  ;(matches || []).forEach(m => {
    ;[...(m.team_a || []), ...(m.team_b || [])].forEach(id => {
      if (!stats[id]) stats[id] = { wins: 0, losses: 0 }
    })
  })

  ;(matches || []).forEach(m => {
    const winners = m.winner === 'A' ? m.team_a : m.team_b
    const losers = m.winner === 'A' ? m.team_b : m.team_a
    ;(winners || []).forEach(id => { if (stats[id]) stats[id].wins++ })
    ;(losers || []).forEach(id => { if (stats[id]) stats[id].losses++ })
  })

  // Classer tous les joueurs ayant joué (participants actuels + retirés)
  const allEventPlayerIds = [...new Set([
    ...participants,
    ...(matches || []).flatMap(m => [...(m.team_a || []), ...(m.team_b || [])])
  ])].filter(id => players.find(p => p.id === id))

  const ranked = allEventPlayerIds
    .sort((a, b) => (stats[b]?.wins || 0) - (stats[a]?.wins || 0))

  const points = EVENT_POINTS[event.type] || [25, 15, 10]
  const updates = []
  let i = 0
  while (i < Math.min(ranked.length, 3)) {
    const currentWins = stats[ranked[i]]?.wins || 0
    const tied = ranked.filter((id, idx) => idx >= i && idx < 3 && (stats[id]?.wins || 0) === currentWins)
    const startIdx = i
    const endIdx = Math.min(startIdx + tied.length - 1, 2)
    const totalPts = points.slice(startIdx, endIdx + 1).reduce((s, p) => s + p, 0)
    const sharedPts = Math.round(totalPts / tied.length)
    tied.forEach(id => {
      const p = players.find(pl => pl.id === id)
      if (p && sharedPts > 0) {
        updates.push(supabase.from('players').update({ elo: p.elo + sharedPts }).eq('id', id))
      }
    })
    i += tied.length
  }
  await Promise.all(updates)

  const standings = ranked.map((id, idx) => {
    // Vrai rang en tenant compte des ex-æquo
    let rank = 1
    for (let j = 0; j < idx; j++) {
      if ((stats[ranked[j]]?.wins || 0) > (stats[id]?.wins || 0)) rank++
    }
    return {
      id, rank,
      wins: stats[id]?.wins || 0,
      losses: stats[id]?.losses || 0,
    }
  })

  const { error } = await supabase.from('events').update({ status: 'closed', standings }).eq('id', event.id)
  if (error) throw error
}
