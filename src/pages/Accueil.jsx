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
    <div style={{ background: '#0A1628', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
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
          gap: 5px;
          padding: 12px 4px;
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
        .nav-icon { font-size: 22px; line-height: 1; }
      `}</style>

      {hasUne ? (
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* Image de fond */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img
              src={une.image_url}
              alt="Une"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block',
              }}
            />
            {/* Fondu haut pour le logo */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
              background: 'linear-gradient(to bottom, rgba(10,22,40,0.82) 0%, transparent 100%)',
            }} />
            {/* Fondu milieu-bas pour le titre */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
              background: 'linear-gradient(to top, rgba(10,22,40,0.98) 0%, rgba(10,22,40,0.6) 50%, transparent 100%)',
            }} />
          </div>

          {/* Layout principal */}
          <div style={{
            position: 'relative', zIndex: 1,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* ── Logo centré en haut ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 28,
              animation: 'fadeIn 0.5s ease',
            }}>
              {/* Feuille blanche derrière le logo */}
              <div style={{
                background: '#fff',
                borderRadius: 3,
                padding: '10px 18px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                position: 'relative',
              }}>
                {/* Petite ligne rouge en haut comme L'Equipe */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 4, background: '#E8000D', borderRadius: '3px 3px 0 0',
                }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: 38,
                  color: '#0A1628',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  marginTop: 4,
                }}>Sanglich</span>
                <span style={{
                  fontSize: 8, fontWeight: 700,
                  color: 'rgba(10,22,40,0.4)',
                  letterSpacing: 3, textTransform: 'uppercase',
                  marginTop: 2,
                }}>Corner · Classement officiel</span>
              </div>
            </div>

            {/* Spacer haut — pousse le titre au centre */}
            <div style={{ flex: 1 }} />

            {/* ── Titre centré ── */}
            <div style={{
              padding: '0 20px',
              textAlign: 'center',
              animation: 'fadeInUp 0.6s ease 0.15s both',
            }}>
              {une.kicker && (
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12, fontWeight: 700, color: '#2E6CC7',
                  letterSpacing: 3, textTransform: 'uppercase',
                  marginBottom: 12,
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
                  letterSpacing: 0,
                  textShadow: '0 2px 28px rgba(0,0,0,0.8)',
                  wordBreak: 'break-word',
                }}>
                  {une.titre}
                </div>
              )}
            </div>

            {/* Spacer bas — pousse la nav en bas */}
            <div style={{ flex: 1 }} />

            {/* ── Nav en bas ── */}
            <div style={{
              padding: '0 18px 36px',
              animation: 'fadeInUp 0.6s ease 0.25s both',
            }}>
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

      ) : (
        /* Pas de Une */
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', animation: 'fadeIn 0.5s ease',
        }}>
          {/* Logo feuille blanche */}
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
