import React, { useEffect, useState } from 'react'
import { getPlayers } from '../lib/supabase'

function winRate(p) {
  const t = (p.wins || 0) + (p.losses || 0)
  return t > 0 ? Math.round(100 * p.wins / t) : 0
}

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

function Avatar({ player, size = 52, fontSize = 18 }) {
  if (player.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt={formatName(player)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
      />
    )
  }
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 900,
      fontSize,
      color: 'rgba(255,255,255,0.25)',
    }}>
      {initials(player)}
    </span>
  )
}

const BADGE_STYLE = [
  { bg: '#F5C842', color: '#0A1628' },
  { bg: '#C0C8D8', color: '#0A1628' },
  { bg: '#C87941', color: '#fff' },
]

function PlayerCard({ player, rank, elevated }) {
  const badge = rank <= 3 ? BADGE_STYLE[rank - 1] : null
  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      background: '#1A3A6B',
      cursor: 'pointer',
      transform: elevated ? 'translateY(-16px)' : 'none',
      transition: 'transform 0.15s',
      flexShrink: 0,
    }}
    onMouseEnter={e => !elevated && (e.currentTarget.style.transform = 'translateY(-4px)')}
    onMouseLeave={e => !elevated && (e.currentTarget.style.transform = 'none')}
    >
      <div style={{
        width: '100%',
        aspectRatio: '3/4',
        background: 'linear-gradient(180deg,#1A3A7A 0%,#0A1628 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Avatar player={player} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(0deg,rgba(10,22,40,0.96) 0%,rgba(10,22,40,0.4) 60%,transparent 100%)',
          padding: '14px 12px 10px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: '#fff',
            lineHeight: 1.1,
            textTransform: 'uppercase',
          }}>
            {(player.first_name || player.name || '').toUpperCase()}
            {player.nickname && <><br /><span style={{ color: '#F5C842', fontStyle: 'italic' }}>"{player.nickname}"</span></>}
            {player.last_name && <><br />{player.last_name.toUpperCase()}</>}
          </div>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            padding: '3px 8px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: rank === 1 ? '#F5C842' : '#fff',
            marginTop: 6,
            letterSpacing: '0.5px',
          }}>
            {(player.elo || 1000).toLocaleString('fr-FR')} pts
          </div>
        </div>
      </div>

      {badge && rank === 1 ? (
        <span style={{
          position: 'absolute', top: 10, left: 10,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 24,
          borderRadius: 8, padding: '5px 13px',
          lineHeight: 1.2, zIndex: 2,
          background: 'linear-gradient(90deg, #B8860B, #FFD700, #FFF8DC, #FFD700, #B8860B)',
          backgroundSize: '200% auto',
          animation: 'shinyGold 2s linear infinite',
          color: '#0A1628',
          boxShadow: '0 0 14px rgba(255,215,0,0.7), 0 0 5px rgba(255,215,0,0.4)',
        }}>
          #1
        </span>
      ) : badge ? (
        <span style={{
          position: 'absolute', top: 10, left: 10,
          background: badge.bg, color: badge.color,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 20,
          borderRadius: 7, padding: '4px 10px',
          lineHeight: 1.2, zIndex: 2,
        }}>
          #{rank}
        </span>
      ) : null}
      <span style={{
        position: 'absolute', top: 10, right: 10,
        fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,0.65)',
        background: 'rgba(10,22,40,0.6)',
        borderRadius: 5, padding: '2px 6px',
      }}>
        {player.wins || 0}V · {player.losses || 0}D
      </span>
    </div>
  )
}

function PlayerRow({ player, rank }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: rank === 4 ? 'linear-gradient(90deg, rgba(245,200,66,0.06), transparent)' : '#fff',
      borderRadius: 12,
      padding: '13px 18px',
      border: rank === 4 ? '1px solid rgba(245,200,66,0.25)' : '1px solid #D8E4F5',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = rank === 4 ? 'linear-gradient(90deg, rgba(245,200,66,0.1), transparent)' : '#F4F8FE'}
    onMouseLeave={e => e.currentTarget.style.background = rank === 4 ? 'linear-gradient(90deg, rgba(245,200,66,0.06), transparent)' : '#fff'}
    >
      {rank === 4 ? (
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: '#2E6CC7', minWidth: 40 }}>
          #{rank}
        </div>
      ) : (
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: '#2E6CC7', minWidth: 40 }}>
          #{rank}
        </div>
      )}
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: '#1A3A6B', border: '2px solid #2E6CC7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {player.photo_url
          ? <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>{initials(player)}</span>
        }
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: '#0A1628', lineHeight: 1 }}>
          {player.first_name || player.name}
          {player.nickname && <span style={{ color: '#2E6CC7', fontStyle: 'italic', fontWeight: 600 }}> "{player.nickname}"</span>}
          {player.last_name && ` ${player.last_name}`}
        </div>
        <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 3 }}>
          {player.wins || 0}V · {player.losses || 0}D · {winRate(player)}%
        </div>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: '#2E6CC7' }}>
        {(player.elo || 1000).toLocaleString('fr-FR')} pts
      </div>
    </div>
  )
}

export default function Classement() {
  const [players, setPlayers] = useState(null)

  useEffect(() => { getPlayers().then(setPlayers).catch(() => setPlayers([])) }, [])

  if (players === null) return <div className="spinner" />

  if (players.length === 0) {
    return (
      <main className="page">
        <div className="page-title">Classement</div>
        <div className="empty">Aucun joueur enregistré.<br />Allez dans "Joueurs" pour commencer !</div>
      </main>
    )
  }

  const top3 = players.slice(0, 3)
  const rest = players.slice(3)
  const podiumOrder = top3.length >= 2 ? [1, 0, 2].filter(i => top3[i]) : [0]

  return (
    <main className="page">
      <style>{`
        @keyframes shinyGold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      <div className="page-title">Classement</div>

      {top3.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(top3.length, 3)}, 1fr)`,
          gap: 12,
          marginBottom: top3.length >= 3 ? 28 : 16,
          alignItems: 'end',
        }}>
          {podiumOrder.map(idx => top3[idx] && (
            <PlayerCard key={top3[idx].id} player={top3[idx]} rank={idx + 1} elevated={idx === 0} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rest.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 4} />)}
        </div>
      )}
    </main>
  )
}
