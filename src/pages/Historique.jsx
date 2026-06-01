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

export default function Historique() {
  const [matches, setMatches] = useState(null)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    Promise.all([getMatches(), getPlayers()]).then(([m, p]) => {
      setMatches(m)
      setPlayers(p)
    })
  }, [])

  const getPlayer = id => players.find(p => p.id === id)

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  if (matches === null) return <div className="spinner" />

  return (
    <main className="page">
      <div className="page-title">Historique</div>

      {matches.length === 0 ? (
        <div className="empty">Aucun match enregistré.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map(m => {
            const winA = m.score_a > m.score_b
            const namesA = (m.team_a || []).map(id => formatName(getPlayer(id))).join(', ')
            const namesB = (m.team_b || []).map(id => formatName(getPlayer(id))).join(', ')
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#fff', borderRadius: 10,
                padding: '12px 16px', border: '1px solid #D8E4F5',
                flexWrap: 'wrap',
              }}>
                <div style={{ fontSize: 11, color: '#7A94B8', minWidth: 50, fontWeight: 600 }}>{formatDate(m.created_at)}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: winA ? '#1A8A4A' : '#0A1628' }}>{namesA}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, color: '#7A94B8', flexShrink: 0 }}>
                    {m.score_a} — {m.score_b}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: !winA ? '#1A8A4A' : '#0A1628' }}>{namesB}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#7A94B8', flexShrink: 0 }}>
                  <span>A: <b style={{ color: m.delta_a >= 0 ? '#1A8A4A' : '#C0392B' }}>{m.delta_a >= 0 ? '+' : ''}{m.delta_a}</b></span>
                  <span>B: <b style={{ color: m.delta_b >= 0 ? '#1A8A4A' : '#C0392B' }}>{m.delta_b >= 0 ? '+' : ''}{m.delta_b}</b></span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
