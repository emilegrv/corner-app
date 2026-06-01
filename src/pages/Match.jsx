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

function computeDeltas(teamA, teamB, scoreA, scoreB, players) {
  const avg = ids => ids.reduce((s, id) => s + players.find(p => p.id === id).elo, 0) / ids.length
  const K = 32
  const expA = 1 / (1 + Math.pow(10, (avg(teamB) - avg(teamA)) / 400))
  const sa = scoreA > scoreB ? 1 : 0
  const deltaA = Math.round(K * (sa - expA))
  const deltaB = Math.round(K * ((1 - sa) - (1 - expA)))
  return { deltaA, deltaB }
}

function PlayerSelect({ value, onChange, players, exclude, label }) {
  return (
    <select
      className="select"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ marginBottom: 8 }}
    >
      <option value="">— {label} —</option>
      {players
        .filter(p => !exclude.includes(p.id) || p.id === value)
        .map(p => (
          <option key={p.id} value={p.id}>{formatName(p)} ({p.elo})</option>
        ))
      }
    </select>
  )
}

export default function Match() {
  const toast = useToast()
  const [players, setPlayers] = useState([])
  const [teamA, setTeamA] = useState(['', '', ''])
  const [teamB, setTeamB] = useState(['', '', ''])
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getPlayers().then(setPlayers) }, [])

  const setA = (i, v) => setTeamA(t => { const n = [...t]; n[i] = v; return n })
  const setB = (i, v) => setTeamB(t => { const n = [...t]; n[i] = v; return n })

  const allSelected = teamA.every(Boolean) && teamB.every(Boolean)
  const allUnique = new Set([...teamA, ...teamB]).size === 6
  const scoresOk = scoreA !== scoreB
  const canSubmit = allSelected && allUnique && scoresOk

  const preview = useMemo(() => {
    if (!canSubmit) return null
    return computeDeltas(teamA, teamB, scoreA, scoreB, players)
  }, [canSubmit, teamA, teamB, scoreA, scoreB, players])

  async function handleSubmit() {
    setLoading(true)
    try {
      await submitMatch({ teamA, teamB, scoreA, scoreB, players })
      toast('Match enregistré !')
      setTeamA(['', '', ''])
      setTeamB(['', '', ''])
      setScoreA(0); setScoreB(0)
      getPlayers().then(setPlayers)
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setLoading(false) }
  }

  if (players.length < 6) {
    return (
      <main className="page">
        <div className="page-title">Nouveau match</div>
        <div className="empty">Il faut au moins 6 joueurs pour jouer un match.</div>
      </main>
    )
  }

  const TeamPanel = ({ label, team, setSlot, color }) => (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 14 }}>
        {label}
      </div>
      {[0, 1, 2].map(i => (
        <PlayerSelect
          key={i}
          value={team[i]}
          onChange={v => setSlot(i, v)}
          players={players}
          exclude={[...team.filter((_, j) => j !== i), ...(label === 'Équipe A' ? teamB : teamA)].filter(Boolean)}
          label={`Joueur ${i + 1}`}
        />
      ))}
    </div>
  )

  return (
    <main className="page">
      <div className="page-title">Nouveau match</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, marginBottom: 20, alignItems: 'start' }}>
        <TeamPanel label="Équipe A" team={teamA} setSlot={setA} color="#2E6CC7" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 52, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: '#7A94B8' }}>VS</div>
        <TeamPanel label="Équipe B" team={teamB} setSlot={setB} color="#C87941" />
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <label className="form-label">Score Équipe A</label>
          <input type="number" min={0} max={99} value={scoreA}
            onChange={e => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ width: 90, background: '#F4F8FE', border: '1.5px solid #D8E4F5', color: '#0A1628', padding: '10px 8px', borderRadius: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 900, textAlign: 'center', display: 'block', margin: '0 auto' }}
          />
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: '#7A94B8' }}>—</div>
        <div style={{ textAlign: 'center' }}>
          <label className="form-label">Score Équipe B</label>
          <input type="number" min={0} max={99} value={scoreB}
            onChange={e => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ width: 90, background: '#F4F8FE', border: '1.5px solid #D8E4F5', color: '#0A1628', padding: '10px 8px', borderRadius: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 900, textAlign: 'center', display: 'block', margin: '0 auto' }}
          />
        </div>
      </div>

      {preview && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 10 }}>Aperçu ELO</div>
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

      {allSelected && allUnique && !scoresOk && (
        <p style={{ color: '#7A94B8', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>Le score doit être différent (pas d'égalité au Corner !)</p>
      )}

      <button className="btn btn-dark btn-full" onClick={handleSubmit} disabled={!canSubmit || loading}>
        {loading ? 'Enregistrement...' : 'Valider le match'}
      </button>
    </main>
  )
}
