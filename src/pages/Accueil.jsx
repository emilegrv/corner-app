import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    getUne().then(setUne)
  }, [])

  const hasUne = une && une.image_url

  return (
    <div style={{ background: '#0A1628' }}>
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
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 4px;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          color: rgba(255,255,255,0.65);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .accueil-nav-item:hover {
          background: rgba(46,108,199,0.2);
          border-color: rgba(46,108,199,0.45);
          color: #fff;
          transform: translateY(-2px);
        }
        .nav-icon { font-size: 24px; line-height: 1; }

        .scroll-hint {
          animation: bounce 1.8s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(6px); opacity: 1; }
        }
      `}</style>

      {hasUne ? (
        <>
          {/* ── SECTION 1 : La Une — exactement 100vh, photo entière ── */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Photo — contain pour voir tout le portrait */}
            <img
              src={une.image_url}
              alt="Une"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center center',
                display: 'block',
                background: '#0A1628',
              }}
            />

            {/* Fondu bas très léger juste pour lisibilité du titre */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
              background: 'linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Contenu par-dessus */}
            <div style={{
              position: 'relative', zIndex: 1,
              flex: 1, display: 'flex', flexDirection: 'column',
            }}>
              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Titre + scroll hint en bas */}
              <div style={{ padding: '0 20px 28px', animation: 'fadeInUp 0.6s ease 0.1s both' }}>
                {une.kicker && (
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 700, color: '#2E6CC7',
                    letterSpacing: 3, textTransform: 'uppercase',
                    marginBottom: 8, textAlign: 'center',
                  }}>
                    {une.kicker}
                  </div>
                )}
                {une.titre && (
                  <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 62,
                    fontWeight: 700,
                    color: '#fff',
                    textTransform: 'uppercase',
                    lineHeight: 0.95,
                    textAlign: 'center',
                    textShadow: '0 2px 20px rgba(0,0,0,0.6)',
                    wordBreak: 'break-word',
                    marginBottom: 24,
                  }}>
                    {une.titre}
                  </div>
                )}

                {/* Scroll hint */}
                <div style={{ textAlign: 'center' }}>
                  <div className="scroll-hint" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                      Swipe
                    </span>
                    <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.45)' }}>↓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2 : Nav — apparaît en scrollant ── */}
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 13,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 4, textTransform: 'uppercase',
              marginBottom: 28,
            }}>
              Navigation
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
                  style={{ animation: `fadeInUp 0.4s ease ${i * 0.06}s both` }}
                >
                  <span className="nav-icon">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
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
