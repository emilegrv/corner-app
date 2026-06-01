import React, { useEffect, useState } from 'react'
import { getSeasons, getPlayers, archiveSeason } from '../lib/supabase'
import { useToast } from '../App'

function formatName(p) {
  if (!p) return '?'
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function winRate(p) {
  const t = (p.wins || 0) + (p.losses || 0)
  return t > 0 ? Math.round(100 * p.wins / t) : 0
}

const SEASON_RESET_DAY = 21
const SEASON_RESET_MONTH = 10 // octobre = 10

function getCurrentSeasonYear() {
  const now = new Date()
  const resetThisYear = new Date(now.getFullYear(), SEASON_RESET_MONTH - 1, SEASON_RESET_DAY)
  return now >= resetThisYear ? now.getFullYear() : now.getFullYear() - 1
}

function isResetDay() {
  const now = new Date()
  return now.getDate() === SEASON_RESET_DAY && now.getMonth() + 1 === SEASON_RESET_MONTH
}

export default function Palmares() {
  const toast = useToast()
  const [seasons, setSeasons] = useState(null)
  const [players, setPlayers] = useState([])
  const [archiving, setArchiving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = () => Promise.all([getSeasons(), getPlayers()]).then(([s, p]) => {
    setSeasons(s)
    setPlayers(p)
  })

  useEffect(() => { load() }, [])

  async function handleArchive() {
    if (!confirm('Archiver la saison courante et remettre tous les ELO à 1000 ?')) return
    setArchiving(true)
    try {
      const year = getCurrentSeasonYear()
      await archiveSeason(year, players)
      toast(`Saison ${year} archivée !`)
      load()
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setArchiving(false) }
  }

  if (seasons === null) return <div className="spinner" />

  const currentYear = getCurrentSeasonYear()
  const isAdmin = true // pour l'instant tout le monde peut archiver

  return (
    <main className="page">
      <div className="page-title">Palmarès</div>

      {/* Current season info */}
      <div style={{ background: '#0A1628', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
          Saison en cours
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: '#F5C842', marginBottom: 4 }}>
          {currentYear} — {currentYear + 1}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          Se termine le 21 octobre {currentYear + 1}
        </div>

        {isResetDay() && (
          <div style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F5C842' }}>
              🎉 C'est le jour anniversaire ! La saison peut être archivée.
            </div>
          </div>
        )}

        <button
          className="btn"
          onClick={handleArchive}
          disabled={archiving}
          style={{ background: '#F5C842', color: '#0A1628', fontWeight: 700 }}
        >
          {archiving ? 'Archivage...' : `Archiver la saison ${currentYear}`}
        </button>
      </div>

      {/* Seasons list */}
      {seasons.length === 0 ? (
        <div className="empty">Aucune saison archivée pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {seasons.map(s => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #D8E4F5', overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#F5C842', minWidth: 60 }}>
                  {s.year}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏆 {s.champion_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 2 }}>
                    {s.champion_elo} pts en fin de saison
                  </div>
                </div>
                <div style={{ fontSize: 18, color: '#7A94B8' }}>{expanded === s.id ? '▲' : '▼'}</div>
              </div>

              {expanded === s.id && s.snapshot && (
                <div style={{ borderTop: '1px solid #D8E4F5', padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    Classement final
                  </div>
                  {[...s.snapshot].sort((a, b) => b.elo - a.elo).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F0F4FB' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: '#2E6CC7', minWidth: 28 }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#0A1628' }}>
                        {formatName(p)}
                      </div>
                      <div style={{ fontSize: 12, color: '#7A94B8' }}>
                        {p.wins}V · {p.losses}D · {winRate(p)}%
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#2E6CC7' }}>
                        {p.elo} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
