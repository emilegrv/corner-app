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

function initials(p) {
  const fn = p.first_name || p.name || '?'
  const ln = p.last_name || ''
  return (fn[0] + (ln[0] || fn[1] || '')).toUpperCase()
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

// Dropdown joueur avec photo + rang
function PlayerSelect({ value, onChange, players, exclude, label, allPlayers }) {
  const [open, setOpen] = useState(false)
  const regular = players.filter(p => !p.is_guest)
  const guests = players.filter(p => p.is_guest)
  const selected = allPlayers.find(p => p.id === value)
  const rank = (id) => {
    const sorted = [...allPlayers].filter(p => !p.is_guest).sort((a, b) => b.elo - a.elo)
    return sorted.findIndex(p => p.id === id) + 1
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: value ? '#EBF2FC' : '#F4F8FE',
          border: `1.5px solid ${value ? '#2E6CC7' : '#D8E4F5'}`,
          borderRadius: 10, padding: '8px 12px',
          cursor: 'pointer', transition: 'all 0.15s', minHeight: 52,
        }}
      >
        {selected ? (
          <>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {selected.photo_url
                ? <img src={selected.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{initials(selected)}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatName(selected)}
              </div>
              <div style={{ fontSize: 11, color: '#2E6CC7', fontWeight: 700 }}>
                #{rank(selected.id)}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#7A94B8', fontWeight: 600 }}>— {label} —</div>
        )}
        <span style={{ color: '#7A94B8', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1.5px solid #D8E4F5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(10,22,40,0.12)', marginTop: 4, overflow: 'hidden',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {regular.filter(p => !exclude.includes(p.id) || p.id === value).map(p => (
            <div key={p.id} onClick={() => { onChange(p.id); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', cursor: 'pointer', transition: 'background 0.1s',
              background: p.id === value ? '#EBF2FC' : '#fff',
              borderBottom: '1px solid #F0F4FB',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F4F8FE'}
            onMouseLeave={e => e.currentTarget.style.background = p.id === value ? '#EBF2FC' : '#fff'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {p.photo_url
                  ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{initials(p)}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatName(p)}
                </div>
                <div style={{ fontSize: 11, color: '#2E6CC7', fontWeight: 700 }}>#{rank(p.id)}</div>
              </div>
            </div>
          ))}
          {guests.length > 0 && (
            <>
              <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: 1, background: '#F8FAFF' }}>Invités</div>
              {guests.filter(p => !exclude.includes(p.id) || p.id === value).map(p => (
                <div key={p.id} onClick={() => { onChange(p.id); setOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', cursor: 'pointer',
                  borderBottom: '1px solid #F0F4FB',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F4F8FE'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed #D8E4F5', background: '#F4F8FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, color: '#7A94B8' }}>{initials(p)}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#7A94B8' }}>👤 {formatName(p)}</div>
                    <div style={{ fontSize: 11, color: '#B0C4DE' }}>Invité</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Boutons score 0/1/2/3
function ScoreButtons({ value, onChange, otherScore, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2, 3].map(n => {
        const isTie = n === 3 && otherScore === 3
        const selected = value === n
        return (
          <button key={n} onClick={() => !isTie && onChange(n)} disabled={isTie}
            title={isTie ? 'Contraire à Sanglich !' : ''}
            style={{
              width: 52, height: 52, borderRadius: 10,
              border: `2.5px solid ${selected ? color : isTie ? '#F5C0C0' : '#D8E4F5'}`,
              background: selected ? color : isTie ? '#FFF0F0' : '#F4F8FE',
              color: selected ? '#fff' : isTie ? '#E0A0A0' : '#0A1628',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 26,
              cursor: isTie ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', opacity: isTie ? 0.4 : 1,
            }}
          >{n}</button>
        )
      })}
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
  const [loading, setLoading] = useState(false)

  useEffect(() => { getPlayers().then(setPlayers) }, [])

  const setA = (i, v) => setTeamA(t => { const n = [...t]; n[i] = v; return n })
  const setB = (i, v) => setTeamB(t => { const n = [...t]; n[i] = v; return n })

  const allSelected = teamA.every(Boolean) && teamB.every(Boolean)
  const allUnique = new Set([...teamA, ...teamB]).size === 6

  const winner = scoreA === 3 ? 'A' : scoreB === 3 ? 'B' : null
  const scoresValid = scoreA !== null && scoreB !== null && winner !== null
  // Bonus bière automatique si score 3-0
  const beerBonus = scoresValid && ((scoreA === 3 && scoreB === 0) || (scoreB === 3 && scoreA === 0))

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

  const allIds = [...teamA, ...teamB].filter(Boolean)
  const exclude = (team, idx) => [...team.filter((_, j) => j !== idx), ...(team === teamA ? teamB : teamA)].filter(Boolean)

  // 🔒 Easter egg secret — Les Avengers
  const AVENGERS = ['juliette', 'jeremy', 'emilien']
  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const isAvengersTeam = (teamIds) => {
    if (teamIds.filter(Boolean).length < 3) return false
    const firstNames = teamIds.map(id => normalize(players.find(pl => pl.id === id)?.first_name))
    return AVENGERS.every(a => firstNames.includes(a))
  }
  const avengersA = isAvengersTeam(teamA)
  const avengersB = isAvengersTeam(teamB)
  const avengerCardStyle = {
    position: 'relative', overflow: 'hidden',
    border: '2px solid transparent',
    backgroundImage: 'linear-gradient(white,white), linear-gradient(120deg,#ff0080,#ff8c00,#ffe000,#40e0d0,#00bfff,#a855f7,#ff0080)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  }

  return (
    <main className="page">
      <style>{`
        @keyframes avengerGlow {
          0%   { box-shadow: 0 0 20px 4px rgba(255,0,128,0.5), 0 0 40px rgba(168,85,247,0.2); }
          25%  { box-shadow: 0 0 20px 4px rgba(0,191,255,0.5), 0 0 40px rgba(255,224,0,0.2); }
          50%  { box-shadow: 0 0 24px 6px rgba(168,85,247,0.6), 0 0 48px rgba(64,224,208,0.3); }
          75%  { box-shadow: 0 0 20px 4px rgba(64,224,208,0.5), 0 0 40px rgba(255,0,128,0.2); }
          100% { box-shadow: 0 0 20px 4px rgba(255,0,128,0.5), 0 0 40px rgba(168,85,247,0.2); }
        }
        @keyframes waveShimmer {
          0%   { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(300%) skewX(-20deg); opacity: 0; }
        }
        .avengers-card {
          position: relative; overflow: hidden;
          border: 2.5px solid transparent !important;
          background-image: linear-gradient(white, white), linear-gradient(120deg,#ff0080,#ff8c00,#ffe000,#40e0d0,#00bfff,#a855f7,#ff0080) !important;
          background-origin: border-box !important;
          background-clip: padding-box, border-box !important;
          animation: avengerGlow 2s ease-in-out infinite;
        }
        .avengers-card::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%);
          animation: waveShimmer 2.4s ease-in-out infinite;
          pointer-events: none; z-index: 1;
        }
        .avengers-watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 64px; letter-spacing: 4px;
          background: linear-gradient(135deg, rgba(100,180,255,0.15), rgba(168,85,247,0.2), rgba(255,200,0,0.12));
          -webkit-background-clip: text; background-clip: text; color: transparent;
          pointer-events: none; user-select: none; white-space: nowrap; z-index: 0;
        }
        .avengers-inner { position: relative; z-index: 2; }
      `}</style>

      <div className="page-title">Nouveau match</div>

      {/* Teams — layout 3 colonnes égales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 12, marginBottom: 24, alignItems: 'start' }}>

        {/* Équipe A */}
        <div className={avengersA ? 'card avengers-card' : 'card'} style={!avengersA ? { borderTop: '3px solid #2E6CC7' } : {}}>
          {avengersA && <div className="avengers-watermark">AVENGERS</div>}
          <div className={avengersA ? 'avengers-inner' : ''}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: avengersA ? '#7C3AED' : '#2E6CC7', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 14 }}>
              {avengersA ? '⚡ Équipe A ⚡' : 'Équipe A'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSelect key={i} value={teamA[i]} onChange={v => setA(i, v)}
                players={players} allPlayers={players}
                exclude={exclude(teamA, i)} label={`Joueur ${i + 1}`} />
            ))}
          </div>
        </div>

        {/* VS au milieu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 40 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: '#7A94B8' }}>VS</div>
        </div>

        {/* Équipe B */}
        <div className={avengersB ? 'card avengers-card' : 'card'} style={!avengersB ? { borderTop: '3px solid #C87941' } : {}}>
          {avengersB && <div className="avengers-watermark">AVENGERS</div>}
          <div className={avengersB ? 'avengers-inner' : ''}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: avengersB ? '#7C3AED' : '#C87941', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 14 }}>
              {avengersB ? '⚡ Équipe B ⚡' : 'Équipe B'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSelect key={i} value={teamB[i]} onChange={v => setB(i, v)}
                players={players} allPlayers={players}
                exclude={exclude(teamB, i)} label={`Joueur ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Score */}
      {allSelected && allUnique && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18 }}>Score</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <ScoreButtons value={scoreA} onChange={setScoreA} otherScore={scoreB} color="#2E6CC7" />
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 900, color: '#D8E4F5', textAlign: 'center' }}>—</div>
              <ScoreButtons value={scoreB} onChange={setScoreB} otherScore={scoreA} color="#C87941" />
            </div>

            {/* Résultat affiché */}
            {scoresValid && (
              <div style={{ textAlign: 'center', padding: '14px 16px', background: '#F4F8FE', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: winner === 'A' ? '#2E6CC7' : '#C0C8D8', lineHeight: 1 }}>{scoreA}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: '#D8E4F5' }}>—</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: winner === 'B' ? '#C87941' : '#C0C8D8', lineHeight: 1 }}>{scoreB}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: winner === 'A' ? '#2E6CC7' : '#C87941', marginTop: 6 }}>
                  🏆 Équipe {winner} gagne
                </div>

                {/* Bonus bière automatique */}
                {beerBonus && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0FAF4', border: '1px solid #C6EFCE', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A8A4A' }}>
                      🍺 * Bonus bière +10 pts pour l'équipe {winner} !
                    </div>
                    <div style={{ fontSize: 12, color: '#5A9A6A', marginTop: 3 }}>
                      Score 3-0 — l'équipe {winner === 'A' ? 'B' : 'A'} n'a pas fini une seule bière
                    </div>
                  </div>
                )}
              </div>
            )}

            {scoreA !== null && scoreB !== null && !scoresValid && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
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

          {/* ELO Preview */}
          {preview && !hasGuest && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 12 }}>
                Aperçu ELO {beerBonus ? '(+10 bonus bière inclus)' : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 16px' }}>
                {/* Équipe A */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#2E6CC7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Équipe A</div>
                  {teamA.map(id => {
                    const p = players.find(pl => pl.id === id)
                    if (!p) return null
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FE', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p.first_name || p.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: preview.deltaA >= 0 ? '#1A8A4A' : '#C0392B' }}>
                          {preview.deltaA >= 0 ? '+' : ''}{preview.deltaA}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Séparateur vertical */}
                <div style={{ background: '#D8E4F5' }} />

                {/* Équipe B */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C87941', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Équipe B</div>
                  {teamB.map(id => {
                    const p = players.find(pl => pl.id === id)
                    if (!p) return null
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FE', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p.first_name || p.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: preview.deltaB >= 0 ? '#1A8A4A' : '#C0392B' }}>
                          {preview.deltaB >= 0 ? '+' : ''}{preview.deltaB}
                        </span>
                      </div>
                    )
                  })}
                </div>
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
