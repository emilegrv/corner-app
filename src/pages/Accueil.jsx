import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUne } from '../lib/supabase'

const navItems = [
  { to: '/classement', label: 'Classement', icon: '📊' },
  { to: '/match', label: 'Match', icon: '🏓' },
  { to: '/evenements', label: "Evènements", icon: '🏆' },
  { to: '/joueurs', label: 'Joueurs', icon: '👥' },
  { to: '/historique', label: 'Historique', icon: '📋' },
  { to: '/palmares', label: "Palmarès", icon: '🥇' },
]

export default function Accueil() {
  const navigate = useNavigate()
  const [une, setUne] = useState(null)
  const [navVisible, setNavVisible] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getUne().then(setUne)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNavVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (bottomRef.current) observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [])

  const hasUne = une && une.image_url

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .accueil-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 12px 4px;
          cursor: pointer;
          border: none;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
          transition: background 0.15s, transform 0.15s;
          color: rgba(255,255,255,0.6);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .accueil-nav-item:hover {
          background: rgba(46,108,199,0.18);
          border-color: rgba(46,108,199,0.35);
          color: #fff;
          transform: translateY(-2px);
        }
        .accueil-nav-item .nav-icon {
          font-size: 20px;
          line-height: 1;
        }

        .nav-section {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .nav-section.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {hasUne ? (
        <>
          {/* Hero plein écran avec photo portrait */}
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Image de fond */}
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 0,
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
              {/* Fondu haut — zone logo */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '20%',
                background: 'linear-gradient(to bottom, rgba(10,22,40,0.6) 0%, transparent 100%)',
              }} />
              {/* Fondu bas — zone titre + nav */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '55%',
                background: 'linear-gradient(to top, rgba(10,22,40,1) 35%, rgba(10,22,40,0.7) 65%, transparent 100%)',
              }} />
            </div>

            {/* Contenu par-dessus */}
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header logo */}
              <div style={{ padding: '20px 20px 0', animation: 'fadeIn 0.6s ease' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 900, fontSize: 28, color: '#fff',
                    letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1,
                    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                  }}>Sanglich</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: 3, textTransform: 'uppercase',
                  }}>Corner · Classement officiel</span>
                </div>
              </div>

              {/* Spacer pour pousser le titre vers le bas */}
              <div style={{ flex: 1 }} />

              {/* Titre centré + nav en bas */}
              <div style={{ padding: '0 20px 32px', animation: 'fadeInUp 0.7s ease 0.2s both' }}>
                {/* Kicker */}
                {une.kicker && (
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 700,
                    color: '#2E6CC7',
                    letterSpacing: 3, textTransform: 'uppercase',
                    marginBottom: 8,
                    textAlign: 'center',
                  }}>
                    {une.kicker}
                  </div>
                )}

                {/* Titre principal — style L'Equipe */}
                {une.titre && (
                  <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 'clamp(36px, 8vw, 52px)',
                    fontWeight: 700,
                    color: '#fff',
                    textTransform: 'uppercase',
                    lineHeight: 1.0,
                    textAlign: 'center',
                    letterSpacing: 1,
                    textShadow: '0 2px 20px rgba(0,0,0,0.6)',
                    marginBottom: 32,
                  }}>
                    {une.titre}
                  </div>
                )}

                {/* Navigation catégories */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {navItems.map(({ to, label, icon }) => (
                    <button key={to} className="accueil-nav-item" onClick={() => navigate(to)}>
                      <span className="nav-icon">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Pas de Une : fond sombre avec nav centrée */
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          animation: 'fadeIn 0.5s ease',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <svg width="48" height="48" viewBox="0 0 52 52" style={{ position: 'absolute', opacity: 0.12, top: '50%', left: '50%', transform: 'translate(-50%,-60%)' }}>
                <circle cx="26" cy="26" r="24" fill="none" stroke="#fff" strokeWidth="2"/>
                <circle cx="26" cy="26" r="16" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 3"/>
                <circle cx="26" cy="26" r="5" fill="#fff" opacity="0.9"/>
              </svg>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 52, color: '#fff',
                letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1,
                position: 'relative',
              }}>Sanglich</div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: 3, textTransform: 'uppercase',
              marginTop: 4,
            }}>Corner · Classement officiel</div>
          </div>

          {/* Nav */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            width: '100%',
            maxWidth: 480,
          }}>
            {navItems.map(({ to, label, icon }, i) => (
              <button
                key={to}
                className="accueil-nav-item"
                onClick={() => navigate(to)}
                style={{ animation: `fadeInUp 0.4s ease ${i * 0.07}s both`, padding: '16px 4px' }}
              >
                <span className="nav-icon" style={{ fontSize: 26 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
