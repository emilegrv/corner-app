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
  const [scrollY, setScrollY] = useState(0)
  const containerRef = useRef()

  useEffect(() => {
    getUne().then(setUne)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => setScrollY(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const hasUne = une && une.image_url

  // Nav apparaît progressivement entre 40% et 80% du premier viewport
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const navProgress = Math.min(1, Math.max(0, (scrollY - vh * 0.35) / (vh * 0.4)))
  // Hint disparaît en scrollant
  const hintOpacity = Math.max(0, 1 - scrollY / (vh * 0.2))

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: hasUne ? 'scroll' : 'auto',
        background: '#fff',
        scrollSnapType: 'none',
        position: 'relative',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50%       { transform: translateY(7px); opacity: 0.9; }
        }

        .accueil-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 13px 4px;
          cursor: pointer;
          border: 1px solid rgba(10,22,40,0.12);
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 10px;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          color: rgba(10,22,40,0.75);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .accueil-nav-item:hover {
          background: rgba(46,108,199,0.15);
          border-color: rgba(46,108,199,0.5);
          color: #0A1628;
          transform: translateY(-2px);
        }
        .nav-icon { font-size: 22px; line-height: 1; }
      `}</style>

      {hasUne ? (
        <>
          {/* ── Photo fixe plein écran ── */}
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
          }}>
            <img
              src={une.image_url}
              alt="Une"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center center',
                display: 'block',
                background: '#fff',
              }}
            />
            {/* Fondu couleur autour de la photo — vignette douce */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse at center, transparent 45%, rgba(255,255,255,0.55) 80%, rgba(255,255,255,0.85) 100%)
              `,
              pointerEvents: 'none',
            }} />
            {/* Fondu bas léger pour le titre */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%',
              background: 'linear-gradient(to top, rgba(255,255,255,0.75) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* ── Contenu scrollable (2x hauteur écran) ── */}
          <div style={{ height: '200vh', position: 'relative', zIndex: 1 }}>

            {/* Titre — visible au premier écran, disparaît en scrollant */}
            <div style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 20px 36px',
              pointerEvents: 'none',
            }}>
              {une.kicker && (
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, fontWeight: 700, color: '#2E6CC7',
                  letterSpacing: 3, textTransform: 'uppercase',
                  marginBottom: 10, textAlign: 'center',
                  opacity: 1 - navProgress,
                  transition: 'opacity 0.1s',
                }}>
                  {une.kicker}
                </div>
              )}
              {une.titre && (
                <div style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 62,
                  fontWeight: 700,
                  color: '#0A1628',
                  textTransform: 'uppercase',
                  lineHeight: 0.95,
                  textAlign: 'center',
                  textShadow: 'none',
                  wordBreak: 'break-word',
                  marginBottom: 28,
                  opacity: 1 - navProgress,
                  transition: 'opacity 0.1s',
                }}>
                  {une.titre}
                </div>
              )}

              {/* Scroll hint */}
              <div style={{
                textAlign: 'center',
                opacity: hintOpacity,
                transition: 'opacity 0.15s',
              }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{
                    fontSize: 9, color: 'rgba(10,22,40,0.4)',
                    letterSpacing: 2, textTransform: 'uppercase',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                  }}>Swipe</span>
                  <span style={{
                    fontSize: 18, color: 'rgba(10,22,40,0.4)',
                    animation: 'bounce 1.8s ease-in-out infinite',
                    display: 'inline-block',
                  }}>↓</span>
                </div>
              </div>
            </div>

            {/* ── Nav — se superpose en fondu sur la photo en scrollant ── */}
            <div style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 10,
              padding: '0 18px 36px',
              opacity: navProgress,
              transform: `translateY(${(1 - navProgress) * 28}px)`,
              transition: 'none',
              pointerEvents: navProgress > 0.1 ? 'auto' : 'none',
            }}>
              {/* Fondu sombre derrière la nav */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 220,
                background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)',
                zIndex: -1,
                borderRadius: 0,
              }} />
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8, position: 'relative',
              }}>
                {navItems.map(({ to, label, icon }) => (
                  <button
                    key={to}
                    className="accueil-nav-item"
                    onClick={() => navigate(to)}
                  >
                    <span className="nav-icon">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </>

      ) : (
        /* Pas de Une */
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            background: '#fff', borderRadius: 3,
            padding: '12px 22px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            position: 'relative', marginBottom: 56,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 4, background: '#E8000D', borderRadius: '3px 3px 0 0',
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 44, color: '#0A1628',
              letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1, marginTop: 4,
            }}>Sanglich</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(10,22,40,0.4)',
              letterSpacing: 3, textTransform: 'uppercase', marginTop: 2,
            }}>Corner · Classement officiel</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, width: '100%', maxWidth: 480,
          }}>
            {navItems.map(({ to, label, icon }, i) => (
              <button
                key={to}
                className="accueil-nav-item"
                onClick={() => navigate(to)}
                style={{ animation: `fadeInUp 0.4s ease ${i * 0.07}s both`, padding: '18px 4px' }}
              >
                <span className="nav-icon" style={{ fontSize: 28 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
