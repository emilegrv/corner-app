import React, { useEffect, useState, useRef } from 'react'
import { getEvents, getPlayers, createEvent, updateEventParticipants, uploadEventPhoto, closeEvent, EVENT_POINTS } from '../lib/supabase'
import { useToast } from '../App'

const ME_KEY = 'sanglich_me_id'
const EVENT_TYPES = ['ACP 250', 'ACP 500', 'ACP 1000', 'WST']

function formatName(p) {
  if (!p) return '?'
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function initials(p) {
  if (!p) return '?'
  const fn = p.first_name || p.name || '?'
  const ln = p.last_name || ''
  return (fn[0] + (ln[0] || fn[1] || '')).toUpperCase()
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeTeams(ids) {
  const shuffled = shuffle(ids)
  const teams = []
  for (let i = 0; i < shuffled.length; i += 3) {
    teams.push(shuffled.slice(i, i + 3))
  }
  return teams
}

const TYPE_COLORS = {
  'ACP 250': '#2E6CC7',
  'ACP 500': '#C87941',
  'ACP 1000': '#1A8A4A',
  'WST': '#7C3AED',
}
const TYPE_BG = {
  'ACP 250': '#EBF2FC',
  'ACP 500': '#FDF3E8',
  'ACP 1000': '#F0FAF4',
  'WST': '#F3F0FF',
}

// ── Create event modal ────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', type: 'ACP 250', description: '', date: '' })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const ev = await createEvent({ name: form.name, type: form.type, description: form.description, date: form.date || null })
      toast(`Évènement "${form.name}" créé !`)
      onCreated(ev)
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(10,22,40,0.3)' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          Nouvel évènement
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nom de l'évènement *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Sanglich Open 2025" maxLength={50} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {EVENT_TYPES.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${form.type === t ? TYPE_COLORS[t] : '#D8E4F5'}`,
                background: form.type === t ? TYPE_BG[t] : '#fff',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700,
                color: form.type === t ? TYPE_COLORS[t] : '#7A94B8',
              }}>
                {t}
                <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: form.type === t ? TYPE_COLORS[t] : '#B0C4DE' }}>
                  {EVENT_POINTS[t]?.join(' / ')} pts
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Date de l'évènement</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Description (optionnel)</label>
          <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Lieu, règles spéciales..." rows={3} style={{ resize: 'vertical' }} />
        </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={!form.name.trim() || saving}>
            {saving ? 'Création...' : 'Créer l\'évènement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Event detail view ─────────────────────────────────────
function EventDetail({ event, players, onBack, onRefresh }) {
  const toast = useToast()
  const meId = localStorage.getItem(ME_KEY)
  const fileRef = useRef()
  const [randomTeams, setRandomTeams] = useState(null)
  const [closing, setClosing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const participants = event.participants || []
  const isClosed = event.status === 'closed'
  const points = EVENT_POINTS[event.type] || [25, 15, 10]

  async function togglePresence(playerId) {
    const updated = participants.includes(playerId)
      ? participants.filter(id => id !== playerId)
      : [...participants, playerId]
    try {
      await updateEventParticipants(event.id, updated)
      onRefresh()
    } catch (e) { toast('Erreur : ' + e.message, true) }
  }

  async function handleClose() {
    if (!confirm(`Clôturer "${event.name}" et distribuer les points bonus ?`)) return
    setClosing(true)
    try {
      await closeEvent(event, players)
      toast('Évènement clôturé — points distribués !')
      onRefresh()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setClosing(false) }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadEventPhoto(event.id, file)
      toast('Photo mise à jour !')
      onRefresh()
    } catch (e) { toast('Erreur upload : ' + e.message, true) }
    finally { setUploading(false) }
  }

  const color = TYPE_COLORS[event.type] || '#2E6CC7'
  const participantPlayers = participants.map(id => players.find(p => p.id === id)).filter(Boolean)

  return (
    <>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2E6CC7', fontWeight: 700, fontSize: 13, fontFamily: "'Barlow', sans-serif", marginBottom: 20, padding: '6px 0' }}>
        <span style={{ fontSize: 18 }}>←</span> Retour aux évènements
      </button>

      {/* Header card */}
      <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, position: 'relative', background: '#0A1628', minHeight: 160 }}>
        {event.photo_url && (
          <img src={event.photo_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <span style={{ display: 'inline-block', background: color, color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{event.type}</span>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: '#fff', letterSpacing: 1 }}>{event.name}</div>
              {event.date && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#fff', marginTop: 4 }}>
                  {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {event.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{event.description}</div>}
            </div>
            {!isClosed && (
              <label style={{ border: '1.5px dashed rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0 }}>
                {uploading ? '...' : '📷 Photo'}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {points.slice(0, 3).map((p, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {['🥇', '🥈', '🥉'][i]} +{p} pts
              </span>
            ))}
            <span style={{ background: isClosed ? 'rgba(91,191,122,0.3)' : 'rgba(255,200,0,0.2)', border: `1px solid ${isClosed ? '#5BBF7A' : '#F5C842'}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: isClosed ? '#5BBF7A' : '#F5C842' }}>
              {isClosed ? '✓ Terminé' : '⏳ En cours'}
            </span>
          </div>
        </div>
      </div>

      {/* Closed standings */}
      {isClosed && event.standings && event.standings.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Classement final</div>
          {event.standings.map((s, i) => {
            const p = players.find(pl => pl.id === s.id)
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F0F4FB' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: color, minWidth: 28 }}>#{i + 1}</div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {p?.photo_url ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{initials(p)}</span>}
                </div>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{formatName(p)}</div>
                <div style={{ fontSize: 12, color: '#7A94B8' }}>{s.wins}V · {s.losses}D</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color }}>+{points[i] || 0} pts</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Participants */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Participants ({participants.length})
        </div>
        {players.filter(p => !p.is_guest).map(p => {
          const present = participants.includes(p.id)
          const isMe = p.id === meId
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F0F4FB' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${present ? '#2E6CC7' : '#D8E4F5'}`, background: present ? '#1A3A6B' : '#F4F8FE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {p.photo_url ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, color: present ? 'rgba(255,255,255,0.5)' : '#7A94B8' }}>{initials(p)}</span>}
              </div>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: present ? '#0A1628' : '#7A94B8' }}>
                {formatName(p)}
                {isMe && <span style={{ fontSize: 10, background: '#1A8A4A', color: '#fff', borderRadius: 4, padding: '1px 5px', marginLeft: 6, fontWeight: 700 }}>Moi</span>}
              </div>
              {!isClosed && (
                <button onClick={() => togglePresence(p.id)} style={{
                  border: `1.5px solid ${present ? '#1A8A4A' : '#D8E4F5'}`,
                  background: present ? '#F0FAF4' : '#fff',
                  borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                  color: present ? '#1A8A4A' : '#7A94B8', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {present ? '✓ Présent' : '+ Rejoindre'}
                </button>
              )}
              {isClosed && present && <span style={{ fontSize: 12, color: '#1A8A4A', fontWeight: 700 }}>✓</span>}
            </div>
          )
        })}
      </div>

      {/* Équipes aléatoires */}
      {!isClosed && participants.length >= 6 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Équipes aléatoires
          </div>
          <button className="btn btn-primary" style={{ marginBottom: randomTeams ? 16 : 0 }} onClick={() => setRandomTeams(makeTeams(participants))}>
            🎲 Générer les équipes
          </button>
          {randomTeams && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {randomTeams.map((team, i) => (
                <div key={i} style={{ background: '#F4F8FE', borderRadius: 10, padding: '12px 14px', border: '1px solid #D8E4F5' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Équipe {i + 1} {team.length < 3 ? `(${team.length} joueurs)` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {team.map(id => {
                      const p = players.find(pl => pl.id === id)
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D8E4F5', borderRadius: 8, padding: '5px 10px' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            {p?.photo_url ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{initials(p)}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p?.first_name || p?.name || '?'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {participants.length < 6 && !isClosed && (
        <div style={{ fontSize: 13, color: '#7A94B8', textAlign: 'center', marginBottom: 20 }}>
          Il faut au moins 6 participants pour générer des équipes ({6 - participants.length} manquant{6 - participants.length > 1 ? 's' : ''})
        </div>
      )}

      {/* Clôturer */}
      {!isClosed && (
        <button className="btn btn-full" onClick={handleClose} disabled={closing || participants.length < 2}
          style={{ background: '#0A1628', color: '#fff', marginTop: 8 }}>
          {closing ? 'Clôture en cours...' : '🏆 Clôturer et distribuer les points'}
        </button>
      )}
    </>
  )
}

// ── Main Evenements page ──────────────────────────────────
export default function Evenements() {
  const [events, setEvents] = useState(null)
  const [players, setPlayers] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = () => Promise.all([getEvents(), getPlayers()]).then(([e, p]) => {
    setEvents(e)
    setPlayers(p)
    if (selected) setSelected(e.find(ev => ev.id === selected.id) || null)
  })

  useEffect(() => { load() }, [])

  if (events === null) return <div className="spinner" />

  if (selected) return (
    <main className="page">
      <EventDetail event={selected} players={players} onBack={() => setSelected(null)} onRefresh={load} />
    </main>
  )

  const ongoing = events.filter(e => e.status === 'ongoing')
  const closed = events.filter(e => e.status === 'closed')

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Évènements</div>
        <button onClick={() => setShowCreate(true)} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: '#2E6CC7', color: '#fff', border: 'none',
          fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(46,108,199,0.4)', transition: 'all 0.15s', fontWeight: 300,
        }}>+</button>
      </div>

      {events.length === 0 && (
        <div className="empty">Aucun évènement. Clique sur "+" pour en créer un !</div>
      )}

      {ongoing.length > 0 && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>En cours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {ongoing.map(ev => <EventCard key={ev.id} event={ev} players={players} onClick={() => setSelected(ev)} />)}
          </div>
        </>
      )}

      {closed.length > 0 && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Terminés</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {closed.map(ev => <EventCard key={ev.id} event={ev} players={players} onClick={() => setSelected(ev)} />)}
          </div>
        </>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={ev => { setShowCreate(false); load(); setSelected(ev) }} />}
    </main>
  )
}

function EventCard({ event, players, onClick }) {
  const color = TYPE_COLORS[event.type] || '#2E6CC7'
  const participants = event.participants || []
  const isClosed = event.status === 'closed'

  return (
    <div onClick={onClick} style={{
      borderRadius: 14, overflow: 'hidden', position: 'relative',
      background: '#0A1628', minHeight: 90, cursor: 'pointer',
      transition: 'transform 0.15s', border: `1px solid ${isClosed ? '#333' : color}`,
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      {event.photo_url && (
        <img src={event.photo_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isClosed ? 0.2 : 0.35 }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: color, color: '#fff', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{event.type}</span>
            {isClosed && <span style={{ background: 'rgba(91,191,122,0.2)', color: '#5BBF7A', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>✓ Terminé</span>}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: 0.5 }}>{event.name}</div>
          {event.date && (
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', marginTop: 2 }}>
              {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{participants.length} participant{participants.length > 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {(EVENT_POINTS[event.type] || []).slice(0, 3).map((p, i) => (
            <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{['🥇', '🥈', '🥉'][i]} +{p}</span>
          ))}
        </div>
        <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)' }}>›</span>
      </div>
    </div>
  )
}
