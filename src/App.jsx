import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Classement from './pages/Classement.jsx'
import Match from './pages/Match.jsx'
import Joueurs from './pages/Joueurs.jsx'
import Historique from './pages/Historique.jsx'
import Palmares from './pages/Palmares.jsx'
import Evenements from './pages/Evenements.jsx'

export const ToastContext = createContext(null)
export function useToast() { return useContext(ToastContext) }

const PingPongLogo = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" style={{ position: 'absolute', opacity: 0.13, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
    <circle cx="26" cy="26" r="24" fill="none" stroke="#fff" strokeWidth="2"/>
    <circle cx="26" cy="26" r="16" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 3"/>
    <circle cx="26" cy="26" r="5" fill="#fff" opacity="0.9"/>
  </svg>
)

const navItems = [
  { to: '/', label: 'Classement' },
  { to: '/match', label: 'Match' },
  { to: '/evenements', label: 'Évènements' },
  { to: '/joueurs', label: 'Joueurs' },
  { to: '/historique', label: 'Historique' },
  { to: '/palmares', label: 'Palmarès' },
]

export default function App() {
  const [toast, setToast] = useState({ msg: '', show: false, error: false })
  const showToast = useCallback((msg, error = false) => {
    setToast({ msg, show: true, error })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      <header style={{ background: '#0A1628', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <PingPongLogo />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#fff', letterSpacing: 2, textTransform: 'uppercase', position: 'relative', zIndex: 1, lineHeight: 1 }}>Sanglich</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>Corner · Classement officiel</span>
        </div>
        <nav style={{ display: 'flex', gap: 3, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px',
              border: isActive ? '1px solid #2E6CC7' : '1px solid transparent',
              background: isActive ? '#2E6CC7' : 'none',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Classement />} />
        <Route path="/match" element={<Match />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/joueurs" element={<Joueurs />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/palmares" element={<Palmares />} />
      </Routes>
      <div className={`toast${toast.error ? ' error' : ''}${toast.show ? ' show' : ''}`}>{toast.msg}</div>
    </ToastContext.Provider>
  )
}
