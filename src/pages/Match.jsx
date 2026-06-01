import React, { useEffect, useState, useMemo } from 'react'
import { getPlayers, submitMatch } from '../lib/supabase'
import { useToast } from '../App'

function formatName(p) {
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function computeDeltas(teamA, teamB, winnerTeam, beerBonus, players) {
  const hasGuest = [...teamA, ...teamB].some(id => players.find(p => p.id === id)?.is_guest)
  if (hasGuest) return null
  const avg = ids => ids.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / ids.length
  const K = 40
  const expA = 1 / (1 + Math.pow(10, (avg(teamB) - avg(teamA)) / 400))
  const sa = winnerTeam === 'A' ? 1 : 0
  let deltaA = Math.round(K * (sa - expA))
  let deltaB = Math.round(K * ((1 - sa) - (1 - expA)))
  if (beerBonus) {
    if (winnerTeam === 'A') deltaA += 10
    else deltaB += 10
  }
  return { deltaA, deltaB }
}

function PlayerSelect({ value, onChange, players, exclude, label }) {
  const regular = players.filter(p => !p.is_guest)
  const guests = players.filter(p => p.is_guest)
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)} style={{ marginBottom: 8 }}>
      <option value="">— {label} —</option>
      {regular.filter(p => !exclude.includes(p.id) || p.id === value).map(p => (
        <option key={p.id} value={p.id}>{formatName(p)} ({p.elo})</option>
      ))}
      {guests.length > 0 && (
        <>
          <option disabled>── Invités ──</option>
          {guests.filter(p => !exclude.includes(p.id) || p.id === value).map(p => (
            <option key={p.id} value={p.id}>👤 {formatName(p)} (invité)</option>
          ))}
        </>
      )}
    </select>
  )
}

// Boutons 0/1/2/3
function ScoreButtons({ value, onChange, otherScore, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map(n => {
          const isTie = n === 3 && otherScore === 3
          const selected = value === n
          return (
            <button
              key={n}
              onClick={() => !isTie && onChange(n)}
              disabled={isTie}
              title={isTie ? 'Contraire à Sanglich de faire match nul !' : ''}
              style={{
                width: 44, height: 44,
                borderRadius: 8,
                border: `2px solid ${selected ? color : isTie ? '#F5C0C0' : '#D8E4F5'}`,
                background: selected ? color : isTie ? '#FFF0F0' : '#F4F8FE',
                color: selected ? '#fff' : isTie ? '#E0A0A0' : '#0A1628',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 22,
                cursor: isTie ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: isTie ? 0.5 : 1,
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Match() {
  const toast = useToast()
  const [players, setPlayers] = useState([])
  const [teamA, setTeamA] = useState(['', '', ''])
  const [teamB, setTeamB] = useState(['', '', ''])
  const [scoreA, setScoreA] = useState(null)
  const [scoreB, setScoreB] = useState(null)
  const [beerBonus, setBeerBonus] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getPlayers().then(setPlayers) }, [])

  const setA = (i, v) => setTeamA(t => { const n = [...t]; n[i] = v; return n })
  const setB = (i, v) => setTeamB(t => { const n = [...t]; n[i] = v; return n })

  const allSelected = teamA.every(Boolean) && teamB.every(Boolean)
  const allUnique = new Set([...teamA, ...teamB]).size === 6

  // Le gagnant est l'équipe avec le score le plus haut (forcément 3)
  const winner = scoreA === 3 ? 'A' : scoreB === 3 ? 'B' : null
  const scoresValid = scoreA !== null && scoreB !== null && winner !== null

  const canSubmit = allSelected && allUnique && scoresValid
  const hasGuest = canSubmit && [...teamA, ...teamB].some(id => players.find(p => p.id === id)?.is_guest)

  const preview = useMemo(() => {
    if (!canSubmit || !winner) return null
    return computeDeltas(teamA, teamB, winner, beerBonus, players)
  }, [canSubmit, winner, teamA, teamB, beerBonus, players])

  async function handleSubmit() {
    setLoading(true)
    try {
      const result = await submitMatch({ teamA, teamB, winnerTeam: winner, beerBonus, players, scoreA, scoreB })
      toast(result.hasGuest ? 'Match enregistré (invité — ELO non modifié)' : 'Match enregistré !')
      setTeamA(['', '', ''])
      setTeamB(['', '', ''])
      setScoreA(null)
      setScoreB(null)
      setBeerBonus(false)
      getPlayers().then(setPlayers)
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setLoading(false) }
  }

  if (players.filter(p => !p.is_guest).length < 6) {
    return (
      <main className="page">
        <div className="page-title">Nouveau match</div>
        <div className="empty">Il faut au moins 6 joueurs réguliers pour jouer un match.</div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-title">Nouveau match</div>

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, marginBottom: 20, alignItems: 'start' }}>
        {[
          { label: 'Équipe A', team: teamA, setSlot: setA, color: '#2E6CC7' },
          { label: 'Équipe B', team: teamB, setSlot: setB, color: '#C87941' }
        ].map(({ label, team, setSlot, color }, ti) => (
          <div key={label} className="card" style={{ borderTop: `3px solid ${color}` }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 14 }}>{label}</div>
            {[0, 1, 2].map(i => (
              <PlayerSelect key={i} value={team[i]} onChange={v => setSlot(i, v)} players={players}
                exclude={[...team.filter((_, j) => j !== i), ...(ti === 0 ? teamB : teamA)].filter(Boolean)}
                label={`Joueur ${i + 1}`} />
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 52, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: '#7A94B8' }}>VS</div>
      </div>

      {/* Score */}
      {allSelected && allUnique && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              Score
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <ScoreButtons value={scoreA} onChange={setScoreA} otherScore={scoreB} label="Équipe A" color="#2E6CC7" />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: '#D8E4F5' }}>—</div>
              <ScoreButtons value={scoreB} onChange={setScoreB} otherScore={scoreA} label="Équipe B" color="#C87941" />
            </div>

            {/* Score display + winner */}
            {scoresValid && (
              <div style={{ textAlign: 'center', marginTop: 16, padding: '12px', background: '#F4F8FE', borderRadius: 10 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: winner === 'A' ? '#2E6CC7' : '#7A94B8' }}>{scoreA}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: '#D8E4F5', margin: '0 10px' }}>—</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: winner === 'B' ? '#C87941' : '#7A94B8' }}>{scoreB}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: winner === 'A' ? '#2E6CC7' : '#C87941', marginTop: 6 }}>
                  🏆 Équipe {winner} gagne
                </div>
              </div>
            )}

            {scoreA !== null && scoreB !== null && !scoresValid && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
                ⚠️ Contraire à Sanglich de faire match nul — une équipe doit arriver à 3 !
              </div>
            )}
          </div>

          {/* Guest warning */}
          {hasGuest && (
            <div style={{ background: '#FFF8E6', border: '1px solid #F5C842', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#856404', fontWeight: 600 }}>
              👤 Un invité est présent — ce match ne comptera pas pour le classement ELO.
            </div>
          )}

          {/* Beer bonus */}
          {scoresValid && !hasGuest && (
            <div onClick={() => setBeerBonus(b => !b)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 10, marginBottom: 20,
              border: `2px solid ${beerBonus ? '#1A8A4A' : '#D8E4F5'}`,
              background: beerBonus ? '#F0FAF4' : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${beerBonus ? '#1A8A4A' : '#D8E4F5'}`,
                background: beerBonus ? '#1A8A4A' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 14, color: '#fff', fontWeight: 700,
              }}>
                {beerBonus ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: beerBonus ? '#1A8A4A' : '#0A1628' }}>
                  Bonus bière 🍺 +10 pts
                </div>
                <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 2 }}>
                  Personne dans l'équipe {winner === 'A' ? 'B' : 'A'} n'a fini sa bière
                </div>
              </div>
            </div>
          )}

          {/* ELO Preview */}
          {preview && !hasGuest && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 10 }}>
                Aperçu ELO {beerBonus ? '(+10 bonus bière inclus)' : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[...teamA.map(id => ({ id, delta: preview.deltaA })), ...teamB.map(id => ({ id, delta: preview.deltaB }))].map(({ id, delta }) => {
                  const p = players.find(pl => pl.id === id)
                  if (!p) return null
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FE', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p.first_name || p.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: delta >= 0 ? '#1A8A4A' : '#C0392B' }}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <button className="btn btn-dark btn-full" onClick={handleSubmit} disabled={!canSubmit || loading}>
        {loading ? 'Enregistrement...' : 'Valider le match'}
      </button>
    </main>
  )
}
