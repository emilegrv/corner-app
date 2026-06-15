import React, { useEffect, useState, useRef } from 'react'
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
  const [imgColor, setImgColor] = useState('#f0f0f0')

  useEffect(() => { getUne().then(setUne) }, [])

  function handleImageLoad(e) {
    try {
      const img = e.target
      const canvas = document.createElement('canvas')
      canvas.width = 4; canvas.height = 4
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 4, 4)
      const d = ctx.getImageData(0, 0, 1, 1).data
      setImgColor(`rgb(${d[0]},${d[1]},${d[2]})`)
    } catch(_) {}
  }

  const hasUne = une && une.image_url

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: imgColor,
      overflow: 'hidden',
      transition: 'background 0.4s ease',
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
          {/* ── Photo — du haut jusqu'au titre ── */}
          <div style={{ flex: 1, overflow: 'hidden', background: imgColor, minHeight: 0 }}>
            <img
              src={une.image_url}
              alt="Une"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center top',
                display: 'block',
              }}
            />
          </div>

          {/* ── Titre ── */}
          <div style={{
            background: '#fff',
            padding: '10px 14px 8px',
            flexShrink: 0,
          }}>
            {une.kicker && (
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#2E6CC7',
                letterSpacing: 1, textTransform: 'uppercase',
                fontFamily: "'Barlow Condensed', sans-serif",
                marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E6CC7', display: 'inline-block', flexShrink: 0 }} />
                {une.kicker}
              </div>
            )}
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#0A1628',
              textTransform: 'uppercase',
              lineHeight: 1.0,
              letterSpacing: 0.5,
              wordBreak: 'break-word',
            }}>
              {une.titre || 'Sanglich Corner'}
            </div>
          </div>

          {/* ── Séparateur ── */}
          <div style={{ height: 1, background: '#e8e8e8', flexShrink: 0 }} />

          {/* ── Navigation catégories ── */}
          <div style={{
            background: '#f7f7f7',
            padding: '10px 16px 14px',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 6,
            }}>
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
        /* ── Pas de Une ── */
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
