import React, { useEffect, useState, useMemo } from 'react'
import { getPlayers, submitMatch, getEvents } from '../lib/supabase'
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

// Dropdown joueur avec photo + rang + joueur extérieur à la volée
function PlayerSelect({ value, onChange, players, exclude, label, allPlayers, guestName, onGuestName }) {
  const [open, setOpen] = useState(false)
  const [typingGuest, setTypingGuest] = useState(false)
  const [guestInput, setGuestInput] = useState('')
  const regular = players.filter(p => !p.is_guest)

  const isGuest = value === '__guest__'
  const selected = isGuest ? null : allPlayers.find(p => p.id === value)

  const rank = (id) => {
    const sorted = [...allPlayers].filter(p => !p.is_guest).sort((a, b) => b.elo - a.elo)
    return sorted.findIndex(p => p.id === id) + 1
  }

  function confirmGuest() {
    if (!guestInput.trim()) return
    onGuestName(guestInput.trim())
    onChange('__guest__')
    setTypingGuest(false)
    setGuestInput('')
    setOpen(false)
  }

  const displayName = isGuest ? (guestName || 'Joueur extérieur') : selected ? formatName(selected) : null

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: isGuest ? '#FFF8E6' : value ? '#EBF2FC' : '#F4F8FE',
        border: `1.5px solid ${isGuest ? '#F5C842' : value ? '#2E6CC7' : '#D8E4F5'}`,
        borderRadius: 10, padding: '8px 12px',
        cursor: 'pointer', transition: 'all 0.15s', minHeight: 52,
      }}>
        {displayName ? (
          <>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${isGuest ? '#F5C842' : '#2E6CC7'}`, background: isGuest ? '#FFF3CC' : '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {!isGuest && selected?.photo_url
                ? <img src={selected.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 13, color: isGuest ? '#856404' : 'rgba(255,255,255,0.6)' }}>
                    {isGuest ? '👤' : initials(selected)}
                  </span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: isGuest ? '#856404' : '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: isGuest ? '#B8860B' : '#2E6CC7', fontWeight: 700 }}>
                {isGuest ? 'Extérieur — hors classement' : `#${rank(selected.id)}`}
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
          maxHeight: 300, overflowY: 'auto',
        }}>
          {regular.filter(p => !exclude.includes(p.id) || p.id === value).map(p => (
            <div key={p.id} onClick={() => { onChange(p.id); onGuestName(''); setOpen(false) }} style={{
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
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatName(p)}</div>
                <div style={{ fontSize: 11, color: '#2E6CC7', fontWeight: 700 }}>#{rank(p.id)}</div>
              </div>
            </div>
          ))}

          {/* Séparateur + joueur extérieur */}
          <div style={{ borderTop: '1px solid #F0F4FB' }}>
            {!typingGuest ? (
              <div onClick={e => { e.stopPropagation(); setTypingGuest(true) }} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', cursor: 'pointer',
                background: '#FFFBF0',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF8E6'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFBF0'}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed #F5C842', background: '#FFF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                  👤
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#856404' }}>+ Joueur extérieur</div>
                  <div style={{ fontSize: 11, color: '#B8860B' }}>Hors classement — ELO non modifié</div>
                </div>
              </div>
            ) : (
              <div onClick={e => e.stopPropagation()} style={{ padding: '10px 12px', background: '#FFFBF0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#856404', marginBottom: 6 }}>Prénom du joueur extérieur</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    autoFocus
                    value={guestInput}
                    onChange={e => setGuestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmGuest(); if (e.key === 'Escape') { setTypingGuest(false); setGuestInput('') } }}
                    placeholder="ex: Marco..."
                    style={{ flex: 1, background: '#fff', border: '1.5px solid #F5C842', borderRadius: 7, padding: '7px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#0A1628' }}
                  />
                  <button onClick={confirmGuest} style={{ background: '#F5C842', border: 'none', borderRadius: 7, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0A1628' }}>OK</button>
                  <button onClick={() => { setTypingGuest(false); setGuestInput('') }} style={{ background: '#F0F4FB', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#7A94B8' }}>✕</button>
                </div>
              </div>
            )}
          </div>
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
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [teamA, setTeamA] = useState(['', '', ''])
  const [teamB, setTeamB] = useState(['', '', ''])
  const [guestNamesA, setGuestNamesA] = useState(['', '', ''])
  const [guestNamesB, setGuestNamesB] = useState(['', '', ''])
  const [scoreA, setScoreA] = useState(null)
  const [scoreB, setScoreB] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPlayers().then(setPlayers)
    getEvents().then(evs => setEvents(evs.filter(e => e.status === 'ongoing')))
  }, [])

  const setA = (i, v) => setTeamA(t => { const n = [...t]; n[i] = v; return n })
  const setB = (i, v) => setTeamB(t => { const n = [...t]; n[i] = v; return n })
  const setGuestA = (i, v) => setGuestNamesA(t => { const n = [...t]; n[i] = v; return n })
  const setGuestB = (i, v) => setGuestNamesB(t => { const n = [...t]; n[i] = v; return n })

  const allSelected = teamA.every(Boolean) && teamB.every(Boolean)
  const allUnique = new Set([...teamA, ...teamB]).size === 6

  const winner = scoreA === 3 ? 'A' : scoreB === 3 ? 'B' : null
  const scoresValid = scoreA !== null && scoreB !== null && winner !== null
  const beerBonus = scoresValid && ((scoreA === 3 && scoreB === 0) || (scoreB === 3 && scoreA === 0))
  const hasGuest = allSelected && ([...teamA, ...teamB].includes('__guest__'))
  const canSubmit = allSelected && allUnique && scoresValid

  const preview = useMemo(() => {
    if (!canSubmit || !winner || hasGuest) return null
    const realTeamA = teamA.filter(id => id !== '__guest__')
    const realTeamB = teamB.filter(id => id !== '__guest__')
    if (realTeamA.length < 3 || realTeamB.length < 3) return null
    return computeDeltas(teamA, teamB, winner, beerBonus, players)
  }, [canSubmit, winner, hasGuest, teamA, teamB, beerBonus, players])

  async function handleSubmit() {
    setLoading(true)
    try {
      const result = await submitMatch({ teamA, teamB, winnerTeam: winner, beerBonus, players, scoreA, scoreB, eventId: selectedEventId || null })
      toast(hasGuest ? 'Match enregistré (joueur extérieur — ELO non modifié)' : 'Match enregistré !')
      setTeamA(['', '', ''])
      setTeamB(['', '', ''])
      setGuestNamesA(['', '', ''])
      setGuestNamesB(['', '', ''])
      setScoreA(null)
      setScoreB(null)
      setSelectedEventId('')
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
          0%   { box-shadow: 0 0 24px 6px rgba(255,0,128,0.6), 0 0 48px rgba(168,85,247,0.3); }
          25%  { box-shadow: 0 0 24px 6px rgba(0,191,255,0.6), 0 0 48px rgba(255,224,0,0.3); }
          50%  { box-shadow: 0 0 30px 8px rgba(168,85,247,0.7), 0 0 60px rgba(64,224,208,0.4); }
          75%  { box-shadow: 0 0 24px 6px rgba(64,224,208,0.6), 0 0 48px rgba(255,0,128,0.3); }
          100% { box-shadow: 0 0 24px 6px rgba(255,0,128,0.6), 0 0 48px rgba(168,85,247,0.3); }
        }
        @keyframes bgPulse {
          0%   { background-color: rgba(30,80,200,0.07); }
          25%  { background-color: rgba(168,85,247,0.09); }
          50%  { background-color: rgba(0,191,255,0.1); }
          75%  { background-color: rgba(64,224,208,0.08); }
          100% { background-color: rgba(30,80,200,0.07); }
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
          background-image: linear-gradient(rgba(30,80,200,0.07), rgba(30,80,200,0.07)), linear-gradient(120deg,#ff0080,#ff8c00,#ffe000,#40e0d0,#00bfff,#a855f7,#ff0080) !important;
          background-origin: border-box !important;
          background-clip: padding-box, border-box !important;
          animation: avengerGlow 2s ease-in-out infinite, bgPulse 2s ease-in-out infinite;
        }
        .avengers-card::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%);
          animation: waveShimmer 2.4s ease-in-out infinite;
          pointer-events: none; z-index: 1;
        }
        .avengers-watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 64px; letter-spacing: 4px;
          background: linear-gradient(135deg, rgba(100,180,255,0.25), rgba(168,85,247,0.3), rgba(255,200,0,0.2));
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
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: avengersA ? 28 : 20, color: avengersA ? '#7C3AED' : '#2E6CC7', textTransform: 'uppercase', letterSpacing: avengersA ? 3 : 1, textAlign: 'center', marginBottom: 14, background: avengersA ? 'linear-gradient(90deg,#ff0080,#a855f7,#00bfff)' : 'none', WebkitBackgroundClip: avengersA ? 'text' : 'unset', WebkitTextFillColor: avengersA ? 'transparent' : 'unset' }}>
              {avengersA ? 'AVENGERS' : 'Équipe A'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSelect key={i} value={teamA[i]} onChange={v => setA(i, v)}
                players={players} allPlayers={players}
                exclude={exclude(teamA, i)} label={`Joueur ${i + 1}`}
                guestName={guestNamesA[i]} onGuestName={v => setGuestA(i, v)} />
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
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: avengersB ? 28 : 20, color: avengersB ? '#7C3AED' : '#C87941', textTransform: 'uppercase', letterSpacing: avengersB ? 3 : 1, textAlign: 'center', marginBottom: 14, background: avengersB ? 'linear-gradient(90deg,#ff0080,#a855f7,#00bfff)' : 'none', WebkitBackgroundClip: avengersB ? 'text' : 'unset', WebkitTextFillColor: avengersB ? 'transparent' : 'unset' }}>
              {avengersB ? 'AVENGERS' : 'Équipe B'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSelect key={i} value={teamB[i]} onChange={v => setB(i, v)}
                players={players} allPlayers={players}
                exclude={exclude(teamB, i)} label={`Joueur ${i + 1}`}
                guestName={guestNamesB[i]} onGuestName={v => setGuestB(i, v)} />
            ))}
          </div>
        </div>
      </div>

      {/* Sélection évènement */}
      {events.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Évènement (optionnel)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              onClick={() => setSelectedEventId('')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${selectedEventId === '' ? '#2E6CC7' : '#D8E4F5'}`,
                background: selectedEventId === '' ? '#EBF2FC' : '#F4F8FE',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedEventId === '' ? '#2E6CC7' : '#D8E4F5', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: selectedEventId === '' ? '#2E6CC7' : '#7A94B8' }}>Aucun évènement</span>
            </div>
            {events.map(ev => {
              const color = { 'ACP 250': '#2E6CC7', 'ACP 500': '#C87941', 'ACP 1000': '#1A8A4A', 'WST': '#7C3AED' }[ev.type] || '#2E6CC7'
              const selected = selectedEventId === ev.id
              return (
                <div key={ev.id} onClick={() => setSelectedEventId(ev.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${selected ? color : '#D8E4F5'}`,
                  background: selected ? `${color}12` : '#fff',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected ? color : '#D8E4F5', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: selected ? color : '#0A1628' }}>{ev.name}</div>
                    {ev.date && <div style={{ fontSize: 11, color: '#7A94B8', marginTop: 1 }}>
                      {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: color, color: '#fff', borderRadius: 5, padding: '2px 7px' }}>{ev.type}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
