import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUne } from '../lib/supabase'

const navItems = [
  { to: '/classement', label: 'Classement', emoji: '📊', color: '#2E6CC7' },
  { to: '/match',      label: 'Match',       emoji: '🏓', color: '#1A8A4A' },
  { to: '/evenements', label: 'Évènements',  emoji: '🏆', color: '#C87941' },
  { to: '/joueurs',    label: 'Joueurs',     emoji: '👥', color: '#7C3AED' },
  { to: '/historique', label: 'Historique',  emoji: '📋', color: '#0A7EA4' },
  { to: '/palmares',   label: 'Palmarès',    emoji: '🥇', color: '#C0392B' },
]

export default function Accueil() {
  const navigate = useNavigate()
  const [une, setUne] = useState(null)

  useEffect(() => { getUne().then(setUne) }, [])

  const hasUne = une && une.image_url

  // Hauteur nav + titre estimée pour que la photo s'arrête pile là
  const NAV_H = 130 // px — titre + catégories

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');

        .nav-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          transition: transform 0.14s;
        }
        .nav-card:active { transform: scale(0.93); }
        .nav-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .nav-card-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #333;
          text-align: center;
          line-height: 1.2;
        }
      `}</style>

      {hasUne ? (
        <>
          {/* ── Photo plein largeur, couvre tout sans bandes ── */}
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            <img
              src={une.image_url}
              alt="Une"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
              }}
            />
            {/* Fondu bas pour transition vers le titre */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 80,
              background: 'linear-gradient(to top, #fff 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* ── Séparateur ── */}
          <div style={{ height: 1, background: '#e8e8e8', flexShrink: 0 }} />

          {/* ── Navigation catégories ── */}
          <div style={{
            background: '#f7f7f7',
            padding: '10px 16px 14px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {navItems.map(({ to, label, emoji, color }) => (
                <button key={to} className="nav-card" onClick={() => navigate(to)}>
                  <div className="nav-card-icon" style={{ background: color }}>
                    <span>{emoji}</span>
                  </div>
                  <span className="nav-card-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ flex: 1, background: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, color: '#0A1628', letterSpacing: 3, textTransform: 'uppercase' }}>Sanglich</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,22,40,0.3)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2, marginBottom: 24 }}>Corner · Classement officiel</div>
              <div style={{ fontSize: 12, color: 'rgba(10,22,40,0.3)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                Allez dans Palmarès pour configurer la Une
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: '#e8e8e8', flexShrink: 0 }} />
          <div style={{ background: '#f7f7f7', padding: '10px 16px 14px', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {navItems.map(({ to, label, emoji, color }) => (
                <button key={to} className="nav-card" onClick={() => navigate(to)}>
                  <div className="nav-card-icon" style={{ background: color }}><span>{emoji}</span></div>
                  <span className="nav-card-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
