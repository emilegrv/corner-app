import React, { useEffect, useState, useMemo, useRef } from 'react'
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
  const avgA = avg(teamA)
  const avgB = avg(teamB)
  const diff = avgA - avgB
  const factor = Math.tanh(diff / 400)
  let deltaWinner, deltaLoser
  if (winnerTeam === 'A') {
    deltaWinner = Math.round(30 - factor * 15)
    deltaLoser  = Math.round(10 + factor * 5)
  } else {
    deltaWinner = Math.round(30 + factor * 15)
    deltaLoser  = Math.round(10 - factor * 5)
  }
  deltaWinner = Math.max(5, deltaWinner)
  deltaLoser  = Math.max(1, deltaLoser)
  let deltaA = winnerTeam === 'A' ? deltaWinner : deltaLoser
  let deltaB = winnerTeam === 'B' ? deltaWinner : deltaLoser
  if (beerBonus) {
    if (winnerTeam === 'A') deltaA += 10
    else deltaB += 10
  }
  return { deltaA, deltaB }
}

// ── Avatar ────────────────────────────────────────────────
function Avatar({ player, size = 40 }) {
  if (!player) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#D8E4F5' }} />
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {player.photo_url
        ? <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: size * 0.35, color: 'rgba(255,255,255,0.7)' }}>{initials(player)}</span>
      }
    </div>
  )
}

// ── Bottom Sheet pour sélection joueur ───────────────────
function PlayerPickerSheet({ open, onClose, onSelect, onGuest, players, exclude, label, rank }) {
  const [guestMode, setGuestMode] = useState(false)
  const [guestInput, setGuestInput] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (!open) { setGuestMode(false); setGuestInput('') }
    if (open && guestMode && inputRef.current) inputRef.current.focus()
  }, [open, guestMode])

  const available = players.filter(p => !p.is_guest && !exclude.includes(p.id))

  function confirmGuest() {
    if (!guestInput.trim()) return
    onGuest(guestInput.trim())
    setGuestMode(false)
    setGuestInput('')
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.45)',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 201, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(10,22,40,0.18)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D8E4F5' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 12px', borderBottom: '1px solid #F0F4FB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1 }}>
            {label}
          </div>
          <button onClick={onClose} style={{ background: '#F4F8FE', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#7A94B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Liste joueurs */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {available.map(p => (
            <div key={p.id} onClick={() => { onSelect(p.id); onClose() }} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px', cursor: 'pointer',
              borderBottom: '1px solid #F4F8FE',
              transition: 'background 0.1s',
              background: '#fff',
            }}
            onTouchStart={e => e.currentTarget.style.background = '#EBF2FC'}
            onTouchEnd={e => e.currentTarget.style.background = '#fff'}
            onMouseEnter={e => e.currentTarget.style.background = '#F4F8FE'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <Avatar player={p} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#0A1628', lineHeight: 1.1 }}>
                  {formatName(p)}
                </div>
                <div style={{ fontSize: 12, color: '#2E6CC7', fontWeight: 700, marginTop: 2 }}>
                  #{rank(p.id)} · {p.elo} pts
                </div>
              </div>
              <div style={{ fontSize: 20, color: '#D8E4F5' }}>›</div>
            </div>
          ))}

          {/* Joueur extérieur */}
          {!guestMode ? (
            <div onClick={() => setGuestMode(true)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px', cursor: 'pointer',
              background: '#FFFBF0', borderTop: '1px solid #F5E0A0',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px dashed #F5C842', background: '#FFF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#856404' }}>+ Joueur extérieur</div>
                <div style={{ fontSize: 12, color: '#B8860B', fontWeight: 600 }}>Hors classement — ELO non modifié</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px 20px', background: '#FFFBF0', borderTop: '1px solid #F5E0A0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#856404', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Prénom du joueur extérieur</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  autoFocus
                  value={guestInput}
                  onChange={e => setGuestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmGuest(); if (e.key === 'Escape') { setGuestMode(false); setGuestInput('') } }}
                  placeholder="ex: Marco..."
                  style={{ flex: 1, background: '#fff', border: '1.5px solid #F5C842', borderRadius: 8, padding: '10px 12px', fontFamily: "'Barlow', sans-serif", fontSize: 15, color: '#0A1628', outline: 'none' }}
                />
                <button onClick={confirmGuest} style={{ background: '#F5C842', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 15, cursor: 'pointer', color: '#0A1628' }}>OK</button>
                <button onClick={() => { setGuestMode(false); setGuestInput('') }} style={{ background: '#F0F4FB', border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 15, cursor: 'pointer', color: '#7A94B8' }}>✕</button>
              </div>
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </>
  )
}

// ── Slot joueur (bouton qui ouvre la sheet) ───────────────
function PlayerSlot({ value, guestName, onClear, onClick, players, allPlayers, rank, color, label }) {
  const isGuest = value === '__guest__'
  const player = isGuest ? null : allPlayers.find(p => p.id === value)
  const isEmpty = !value

  return (
    <div onClick={isEmpty || value ? onClick : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: isGuest ? '#FFF8E6' : value ? (color === '#2E6CC7' ? '#EBF2FC' : '#FDF3E8') : '#F4F8FE',
      border: `1.5px solid ${isGuest ? '#F5C842' : value ? color : '#D8E4F5'}`,
      borderRadius: 10, padding: '9px 12px',
      cursor: 'pointer', marginBottom: 8, minHeight: 56,
      transition: 'all 0.15s',
    }}>
      {value ? (
        <>
          {isGuest
            ? <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px dashed #F5C842', background: '#FFF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
            : <Avatar player={player} size={38} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isGuest ? '#856404' : '#0A1628', lineHeight: 1.1 }}>
              {isGuest ? (guestName || 'Joueur extérieur') : formatName(player)}
            </div>
            <div style={{ fontSize: 11, color: isGuest ? '#B8860B' : color, fontWeight: 700 }}>
              {isGuest ? 'Hors classement' : `#${rank(player.id)} · ${player.elo} pts`}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onClear() }} style={{ background: 'rgba(120,148,184,0.12)', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: '#7A94B8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </>
      ) : (
        <>
          <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px dashed #D8E4F5', background: '#EBF2FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18, opacity: 0.4 }}>+</span>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#7A94B8', fontWeight: 600 }}>
            {label}
          </div>
        </>
      )}
    </div>
  )
}

// ── Score buttons ─────────────────────────────────────────
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

// ── Page principale ───────────────────────────────────────
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
  const [sheet, setSheet] = useState(null) // { team: 'A'|'B', idx: 0|1|2 }

  useEffect(() => {
    getPlayers().then(setPlayers)
    getEvents().then(evs => setEvents(evs.filter(e => e.status === 'ongoing')))
  }, [])

  const setA = (i, v) => setTeamA(t => { const n = [...t]; n[i] = v; return n })
  const setB = (i, v) => setTeamB(t => { const n = [...t]; n[i] = v; return n })
  const setGuestA = (i, v) => setGuestNamesA(t => { const n = [...t]; n[i] = v; return n })
  const setGuestB = (i, v) => setGuestNamesB(t => { const n = [...t]; n[i] = v; return n })

  const clearA = (i) => { setA(i, ''); setGuestA(i, '') }
  const clearB = (i) => { setB(i, ''); setGuestB(i, '') }

  const allSelected = teamA.every(Boolean) && teamB.every(Boolean)
  const allUnique = new Set([...teamA, ...teamB]).size === 6
  const winner = scoreA === 3 ? 'A' : scoreB === 3 ? 'B' : null
  const scoresValid = scoreA !== null && scoreB !== null && winner !== null
  const beerBonus = scoresValid && ((scoreA === 3 && scoreB === 0) || (scoreB === 3 && scoreA === 0))
  const hasGuest = allSelected && ([...teamA, ...teamB].includes('__guest__'))
  const canSubmit = allSelected && allUnique && scoresValid

  const rank = (id) => {
    const sorted = [...players].filter(p => !p.is_guest).sort((a, b) => b.elo - a.elo)
    return sorted.findIndex(p => p.id === id) + 1
  }

  const preview = useMemo(() => {
    if (!canSubmit || !winner) return null
    const realTeamA = teamA.filter(id => id !== '__guest__' && players.find(p => p.id === id))
    const realTeamB = teamB.filter(id => id !== '__guest__' && players.find(p => p.id === id))
    if (realTeamA.length === 0 || realTeamB.length === 0) return null
    return computeDeltas(realTeamA, realTeamB, winner, beerBonus, players)
  }, [canSubmit, winner, teamA, teamB, beerBonus, players])

  async function handleSubmit() {
    setLoading(true)
    try {
      await submitMatch({ teamA, teamB, winnerTeam: winner, beerBonus, players, scoreA, scoreB, eventId: selectedEventId || null, guestNamesA, guestNamesB })
      toast('Match enregistré !')
      setTeamA(['', '', '']); setTeamB(['', '', ''])
      setGuestNamesA(['', '', '']); setGuestNamesB(['', '', ''])
      setScoreA(null); setScoreB(null); setSelectedEventId('')
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

  const excludeFor = (team, idx) => [
    ...( team === 'A' ? teamA : teamB ).filter((_, j) => j !== idx),
    ...( team === 'A' ? teamB : teamA ),
  ].filter(Boolean)

  // Easter egg Avengers
  const AVENGERS = ['juliette', 'jeremy', 'emilien']
  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const isAvengersTeam = (teamIds) => {
    if (teamIds.filter(Boolean).length < 3) return false
    const firstNames = teamIds.map(id => normalize(players.find(pl => pl.id === id)?.first_name))
    return AVENGERS.every(a => firstNames.includes(a))
  }
  const avengersA = isAvengersTeam(teamA)
  const avengersB = isAvengersTeam(teamB)

  return (
    <main className="page">
      <style>{`
        @keyframes avengerGlow {
          0%   { box-shadow: 0 0 24px 6px rgba(255,0,128,0.6), 0 0 48px rgba(168,85,247,0.3); }
          50%  { box-shadow: 0 0 30px 8px rgba(168,85,247,0.7), 0 0 60px rgba(64,224,208,0.4); }
          100% { box-shadow: 0 0 24px 6px rgba(255,0,128,0.6), 0 0 48px rgba(168,85,247,0.3); }
        }
        @keyframes bgPulse {
          0%   { background-color: rgba(30,80,200,0.07); }
          50%  { background-color: rgba(0,191,255,0.1); }
          100% { background-color: rgba(30,80,200,0.07); }
        }
        @keyframes waveShimmer {
          0%   { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
          20%  { opacity: 1; } 80% { opacity: 1; }
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

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 10, marginBottom: 24, alignItems: 'start' }}>

        {/* Équipe A */}
        <div className={avengersA ? 'card avengers-card' : 'card'} style={!avengersA ? { borderTop: '3px solid #2E6CC7' } : {}}>
          {avengersA && <div className="avengers-watermark">AVENGERS</div>}
          <div className={avengersA ? 'avengers-inner' : ''}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: avengersA ? 22 : 18, color: avengersA ? '#7C3AED' : '#2E6CC7', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12, background: avengersA ? 'linear-gradient(90deg,#ff0080,#a855f7,#00bfff)' : 'none', WebkitBackgroundClip: avengersA ? 'text' : 'unset', WebkitTextFillColor: avengersA ? 'transparent' : 'unset' }}>
              {avengersA ? 'AVENGERS' : 'Équipe A'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSlot key={i}
                value={teamA[i]}
                guestName={guestNamesA[i]}
                onClear={() => clearA(i)}
                onClick={() => setSheet({ team: 'A', idx: i })}
                players={players} allPlayers={players}
                rank={rank} color="#2E6CC7"
                label={`Joueur ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 36 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: '#7A94B8' }}>VS</div>
        </div>

        {/* Équipe B */}
        <div className={avengersB ? 'card avengers-card' : 'card'} style={!avengersB ? { borderTop: '3px solid #C87941' } : {}}>
          {avengersB && <div className="avengers-watermark">AVENGERS</div>}
          <div className={avengersB ? 'avengers-inner' : ''}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: avengersB ? 22 : 18, color: avengersB ? '#7C3AED' : '#C87941', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12, background: avengersB ? 'linear-gradient(90deg,#ff0080,#a855f7,#00bfff)' : 'none', WebkitBackgroundClip: avengersB ? 'text' : 'unset', WebkitTextFillColor: avengersB ? 'transparent' : 'unset' }}>
              {avengersB ? 'AVENGERS' : 'Équipe B'}
            </div>
            {[0, 1, 2].map(i => (
              <PlayerSlot key={i}
                value={teamB[i]}
                guestName={guestNamesB[i]}
                onClear={() => clearB(i)}
                onClick={() => setSheet({ team: 'B', idx: i })}
                players={players} allPlayers={players}
                rank={rank} color="#C87941"
                label={`Joueur ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      {sheet && (
        <PlayerPickerSheet
          open={!!sheet}
          onClose={() => setSheet(null)}
          onSelect={id => {
            if (sheet.team === 'A') { setA(sheet.idx, id); setGuestA(sheet.idx, '') }
            else { setB(sheet.idx, id); setGuestB(sheet.idx, '') }
            setSheet(null)
          }}
          onGuest={name => {
            if (sheet.team === 'A') { setA(sheet.idx, '__guest__'); setGuestA(sheet.idx, name) }
            else { setB(sheet.idx, '__guest__'); setGuestB(sheet.idx, name) }
          }}
          players={players}
          exclude={excludeFor(sheet.team, sheet.idx)}
          label={`${sheet.team === 'A' ? 'Équipe A' : 'Équipe B'} — Joueur ${sheet.idx + 1}`}
          rank={rank}
        />
      )}

      {/* Évènement */}
      {events.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Évènement (optionnel)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div onClick={() => setSelectedEventId('')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${selectedEventId === '' ? '#2E6CC7' : '#D8E4F5'}`, background: selectedEventId === '' ? '#EBF2FC' : '#F4F8FE' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedEventId === '' ? '#2E6CC7' : '#D8E4F5', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: selectedEventId === '' ? '#2E6CC7' : '#7A94B8' }}>Aucun évènement</span>
            </div>
            {events.map(ev => {
              const color = { 'ACP 250': '#2E6CC7', 'ACP 500': '#C87941', 'ACP 1000': '#1A8A4A', 'WST': '#7C3AED' }[ev.type] || '#2E6CC7'
              const selected = selectedEventId === ev.id
              const participants = ev.participants || []
              const selectedPlayerIds = [...teamA, ...teamB].filter(id => id && id !== '__guest__')
              const missingPlayers = selectedPlayerIds.filter(id => !participants.includes(id)).map(id => players.find(p => p.id === id)?.first_name || '?')
              const isEligible = missingPlayers.length === 0
              return (
                <div key={ev.id} onClick={() => isEligible && setSelectedEventId(ev.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: isEligible ? 'pointer' : 'not-allowed', border: `1.5px solid ${!isEligible ? '#F5C0C0' : selected ? color : '#D8E4F5'}`, background: !isEligible ? '#FFF8F8' : selected ? `${color}12` : '#fff', opacity: isEligible ? 1 : 0.7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: !isEligible ? '#F5C0C0' : selected ? color : '#D8E4F5', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: !isEligible ? '#C0392B' : selected ? color : '#0A1628' }}>{ev.name}</div>
                    {ev.date && <div style={{ fontSize: 11, color: '#7A94B8', marginTop: 1 }}>{new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                    {!isEligible && <div style={{ fontSize: 11, color: '#C0392B', marginTop: 2, fontWeight: 600 }}>{missingPlayers.join(', ')} {missingPlayers.length > 1 ? 'ne sont pas' : "n'est pas"} inscrit{missingPlayers.length > 1 ? 's' : ''}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: isEligible ? color : '#F5C0C0', color: isEligible ? '#fff' : '#C0392B', borderRadius: 5, padding: '2px 7px' }}>{ev.type}</span>
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
            {scoresValid && (
              <div style={{ textAlign: 'center', padding: '14px 16px', background: '#F4F8FE', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: winner === 'A' ? '#2E6CC7' : '#C0C8D8', lineHeight: 1 }}>{scoreA}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: '#D8E4F5' }}>—</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: winner === 'B' ? '#C87941' : '#C0C8D8', lineHeight: 1 }}>{scoreB}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: winner === 'A' ? '#2E6CC7' : '#C87941', marginTop: 6 }}>🏆 Équipe {winner} gagne</div>
                {beerBonus && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0FAF4', border: '1px solid #C6EFCE', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A8A4A' }}>🍺 Bonus bière +10 pts pour l'équipe {winner} !</div>
                    <div style={{ fontSize: 12, color: '#5A9A6A', marginTop: 3 }}>Score 3-0 — l'équipe {winner === 'A' ? 'B' : 'A'} n'a pas fini une seule bière</div>
                  </div>
                )}
              </div>
            )}
            {scoreA !== null && scoreB !== null && !scoresValid && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>⚠️ Contraire à Sanglich de faire match nul — une équipe doit arriver à 3 !</div>
            )}
          </div>

          {hasGuest && (
            <div style={{ background: '#FFF8E6', border: '1px solid #F5C842', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#856404', fontWeight: 600 }}>
              👤 Un invité est présent — l'ELO des joueurs réguliers est quand même calculé, l'invité est hors classement.
            </div>
          )}

          {preview && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 12 }}>Aperçu ELO {beerBonus ? '(+10 bonus bière inclus)' : ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 16px' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#2E6CC7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Équipe A</div>
                  {teamA.map(id => {
                    if (id === '__guest__') return <div key="g-a" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF8E6', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#856404' }}>Invité</span><span style={{ fontSize: 12, color: '#B8860B' }}>hors classement</span></div>
                    const p = players.find(pl => pl.id === id)
                    if (!p) return null
                    return <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FE', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p.first_name || p.name}</span><span style={{ fontSize: 13, fontWeight: 700, color: preview.deltaA >= 0 ? '#1A8A4A' : '#C0392B' }}>{preview.deltaA >= 0 ? '+' : ''}{preview.deltaA}</span></div>
                  })}
                </div>
                <div style={{ background: '#D8E4F5' }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C87941', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Équipe B</div>
                  {teamB.map(id => {
                    if (id === '__guest__') return <div key="g-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF8E6', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#856404' }}>Invité</span><span style={{ fontSize: 12, color: '#B8860B' }}>hors classement</span></div>
                    const p = players.find(pl => pl.id === id)
                    if (!p) return null
                    return <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F8FE', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p.first_name || p.name}</span><span style={{ fontSize: 13, fontWeight: 700, color: preview.deltaB >= 0 ? '#1A8A4A' : '#C0392B' }}>{preview.deltaB >= 0 ? '+' : ''}{preview.deltaB}</span></div>
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
