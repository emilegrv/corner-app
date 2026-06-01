import React, { useEffect, useState } from 'react'
import { getMatches, getPlayers } from '../lib/supabase'

function formatName(p) {
  if (!p) return '?'
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function formatNameBold(p, boldId) {
  if (!p) return '?'
  const name = formatName(p)
  if (p.id === boldId) return <strong>{name}</strong>
  return name
}

function initials(p) {
  if (!p) return '?'
  const fn = p.first_name || p.name || '?'
  const ln = p.last_name || ''
  return (fn[0] + (ln[0] || fn[1] || '')).toUpperCase()
}

function winRate(p) {
  const t = (p.wins || 0) + (p.losses || 0)
  return t > 0 ? Math.round(100 * p.wins / t) : 0
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Back button ───────────────────────────────────────────
function BackButton({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#2E6CC7', fontWeight: 700, fontSize: 13,
      fontFamily: "'Barlow', sans-serif",
      marginBottom: 20, padding: '6px 0',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>←</span> {label}
    </button>
  )
}

// ── Match row ─────────────────────────────────────────────
function MatchRow({ match, players, highlightId }) {
  const getP = id => players.find(p => p.id === id)
  const winTeamIds = match.winner === 'A' ? match.team_a : match.team_b
  const loseTeamIds = match.winner === 'A' ? match.team_b : match.team_a

  return (
    <div style={{
      background: '#fff', borderRadius: 10,
      border: `1px solid ${match.has_guest ? '#F5C842' : '#D8E4F5'}`,
      padding: '12px 14px', marginBottom: 8,
    }}>
      {/* Date + event name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#7A94B8', fontWeight: 600 }}>{formatDate(match.created_at)}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {match.beer_bonus && <span style={{ fontSize: 11, background: '#F0FAF4', color: '#1A8A4A', border: '1px solid #C6EFCE', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>🍺 +10</span>}
          {match.has_guest && <span style={{ fontSize: 11, background: '#FFF8E6', color: '#856404', border: '1px solid #F5C842', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>Invité</span>}
        </div>
      </div>
      {match.event_name && (
        <div style={{ fontWeight: 700, color: '#2E6CC7', fontSize: 13, marginBottom: 8 }}>{match.event_name}</div>
      )}

      {/* Teams + score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        {/* Winners */}
        <div>
          {winTeamIds.map(id => {
            const p = getP(id)
            return (
              <div key={id} style={{ fontSize: 13, color: '#1A8A4A', marginBottom: 2 }}>
                {highlightId ? formatNameBold(p, highlightId) : formatName(p)}
              </div>
            )
          })}
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: '#0A1628', whiteSpace: 'nowrap' }}>
          🏆
        </div>

        {/* Losers */}
        <div style={{ textAlign: 'right' }}>
          {loseTeamIds.map(id => {
            const p = getP(id)
            return (
              <div key={id} style={{ fontSize: 13, color: '#7A94B8', marginBottom: 2 }}>
                {highlightId ? formatNameBold(p, highlightId) : formatName(p)}
              </div>
            )
          })}
        </div>
      </div>

      {/* ELO deltas */}
      {!match.has_guest && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: '#7A94B8' }}>
            {match.winner === 'A' ? '✓' : '✗'} A: <b style={{ color: match.delta_a >= 0 ? '#1A8A4A' : '#C0392B' }}>{match.delta_a >= 0 ? '+' : ''}{match.delta_a}</b>
          </span>
          <span style={{ fontSize: 11, color: '#7A94B8' }}>
            {match.winner === 'B' ? '✓' : '✗'} B: <b style={{ color: match.delta_b >= 0 ? '#1A8A4A' : '#C0392B' }}>{match.delta_b >= 0 ? '+' : ''}{match.delta_b}</b>
          </span>
        </div>
      )}
    </div>
  )
}

// ── All matches view ──────────────────────────────────────
function AllMatches({ matches, players, onBack }) {
  return (
    <>
      <BackButton onClick={onBack} label="Retour à l'historique" />
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#0A1628', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 }}>
        Toutes les parties
      </div>
      {matches.length === 0
        ? <div className="empty">Aucun match enregistré.</div>
        : matches.map(m => <MatchRow key={m.id} match={m} players={players} />)
      }
    </>
  )
}

// ── Player history view ───────────────────────────────────
function PlayerHistory({ player, matches, players, onBack }) {
  const playerMatches = matches.filter(m =>
    [...(m.team_a || []), ...(m.team_b || [])].includes(player.id)
  )

  return (
    <>
      <BackButton onClick={onBack} label="Retour aux joueurs" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {player.photo_url
            ? <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>{initials(player)}</span>
          }
        </div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: '#0A1628', textTransform: 'uppercase' }}>{formatName(player)}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A8A4A' }}>{player.wins || 0} V</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C0392B' }}>{player.losses || 0} D</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7A94B8' }}>{winRate(player)}% win</span>
          </div>
        </div>
      </div>

      {playerMatches.length === 0
        ? <div className="empty">Aucun match pour ce joueur.</div>
        : playerMatches.map(m => <MatchRow key={m.id} match={m} players={players} highlightId={player.id} />)
      }
    </>
  )
}

// ── Player picker ─────────────────────────────────────────
function PlayerPicker({ players, onSelect, onBack }) {
  const regular = players.filter(p => !p.is_guest)
  return (
    <>
      <BackButton onClick={onBack} label="Retour à l'historique" />
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#0A1628', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 }}>
        Choisir un joueur
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {regular.map(p => (
          <div key={p.id} onClick={() => onSelect(p)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#fff', border: '1px solid #D8E4F5',
            borderRadius: 12, padding: '12px 16px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F4F8FE'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {p.photo_url
                ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>{initials(p)}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628' }}>{formatName(p)}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A8A4A' }}>{p.wins || 0} V</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C0392B' }}>{p.losses || 0} D</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7A94B8' }}>{winRate(p)}%</span>
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#D8E4F5' }}>›</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Main Historique page ──────────────────────────────────
export default function Historique() {
  const [matches, setMatches] = useState(null)
  const [players, setPlayers] = useState([])
  // view: 'menu' | 'all' | 'player-pick' | 'player-history'
  const [view, setView] = useState('menu')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  useEffect(() => {
    Promise.all([getMatches(), getPlayers()]).then(([m, p]) => {
      setMatches(m)
      setPlayers(p)
    })
  }, [])

  if (matches === null) return <div className="spinner" />

  // Sub-views
  if (view === 'all') return (
    <main className="page">
      <AllMatches matches={matches} players={players} onBack={() => setView('menu')} />
    </main>
  )

  if (view === 'player-pick') return (
    <main className="page">
      <PlayerPicker players={players} onSelect={p => { setSelectedPlayer(p); setView('player-history') }} onBack={() => setView('menu')} />
    </main>
  )

  if (view === 'player-history' && selectedPlayer) return (
    <main className="page">
      <PlayerHistory player={selectedPlayer} matches={matches} players={players} onBack={() => setView('player-pick')} />
    </main>
  )

  // Main menu
  return (
    <main className="page">
      <div className="page-title">Historique</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          {
            id: 'all',
            icon: '📋',
            title: 'Toutes les parties',
            sub: `${matches.length} match${matches.length > 1 ? 's' : ''} enregistré${matches.length > 1 ? 's' : ''}`,
          },
          {
            id: 'player-pick',
            icon: '👤',
            title: 'Par joueur',
            sub: 'Voir l\'historique et les stats d\'un joueur',
          },
        ].map(({ id, icon, title, sub }) => (
          <div key={id} onClick={() => setView(id)} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: '#fff', border: '1px solid #D8E4F5',
            borderRadius: 14, padding: '18px 20px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FE'; e.currentTarget.style.borderColor = '#2E6CC7' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D8E4F5' }}
          >
            <div style={{ fontSize: 28 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 2 }}>{sub}</div>
            </div>
            <span style={{ fontSize: 22, color: '#D8E4F5', fontWeight: 700 }}>›</span>
          </div>
        ))}
      </div>
    </main>
  )
}
