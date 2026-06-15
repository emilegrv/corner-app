import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Accueil from './pages/Accueil.jsx'
import Classement from './pages/Classement.jsx'
import Match from './pages/Match.jsx'
import Joueurs from './pages/Joueurs.jsx'
import Historique from './pages/Historique.jsx'
import Palmares from './pages/Palmares.jsx'
import Evenements from './pages/Evenements.jsx'

export const ToastContext = createContext(null)
export function useToast() { return useContext(ToastContext) }

const navItems = [
  { to: '/classement', label: 'Classement', emoji: '📊' },
  { to: '/match',      label: 'Match',       emoji: '🏓' },
  { to: '/evenements', label: 'Évènements',  emoji: '🏆' },
  { to: '/joueurs',    label: 'Joueurs',     emoji: '👥' },
  { to: '/historique', label: 'Historique',  emoji: '📋' },
  { to: '/palmares',   label: 'Palmarès',    emoji: '🥇' },
]

const NAV_COLORS = {
  '/classement': '#2E6CC7',
  '/match':      '#1A8A4A',
  '/evenements': '#C87941',
  '/joueurs':    '#7C3AED',
  '/historique': '#0A7EA4',
  '/palmares':   '#C0392B',
}

function AppShell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAccueil = location.pathname === '/'
  const activeColor = NAV_COLORS[location.pathname] || '#2E6CC7'

  if (isAccueil) return <>{children}</>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f4fb' }}>

      {/* ── Header : logo Sanglich centré ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e8edf5',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Barre couleur active en haut */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: activeColor,
          transition: 'background 0.2s',
        }} />

        {/* Logo cliquable */}
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', textAlign: 'center', paddingTop: 4, userSelect: 'none' }}
        >
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900, fontSize: 26, color: '#0A1628',
            letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1,
          }}>Sanglich</div>
          <div style={{
            fontSize: 8, fontWeight: 700,
            color: 'rgba(10,22,40,0.3)',
            letterSpacing: 3, textTransform: 'uppercase',
          }}>Corner · Classement officiel</div>
        </div>
      </div>

      {/* ── Contenu scrollable ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>

      {/* ── Nav icônes en bas — même style que l'accueil ── */}
      <div style={{
        background: '#f7f7f7',
        borderTop: '1px solid #e8e8e8',
        padding: '8px 12px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {navItems.map(({ to, label, emoji }) => {
            const isActive = location.pathname === to
            const color = NAV_COLORS[to]
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '6px 2px', cursor: 'pointer',
                  background: 'none', border: 'none',
                  transition: 'transform 0.12s',
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isActive ? color : 'rgba(10,22,40,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  transition: 'background 0.15s',
                  boxShadow: isActive ? `0 2px 8px ${color}55` : 'none',
                }}>
                  {emoji}
                </div>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                  color: isActive ? color : 'rgba(10,22,40,0.4)',
                  textAlign: 'center', lineHeight: 1.2,
                  transition: 'color 0.15s',
                }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [toast, setToast] = useState({ msg: '', show: false, error: false })
  const showToast = useCallback((msg, error = false) => {
    setToast({ msg, show: true, error })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      <AppShell>
        <Routes>
          <Route path="/"           element={<Accueil />} />
          <Route path="/classement" element={<Classement />} />
          <Route path="/match"      element={<Match />} />
          <Route path="/evenements" element={<Evenements />} />
          <Route path="/joueurs"    element={<Joueurs />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="/palmares"   element={<Palmares />} />
        </Routes>
      </AppShell>
      <div className={`toast${toast.error ? ' error' : ''}${toast.show ? ' show' : ''}`}>{toast.msg}</div>
    </ToastContext.Provider>
  )
}
