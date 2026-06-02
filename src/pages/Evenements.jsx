import React, { useEffect, useState, useRef } from 'react'
import { getEvents, getPlayers, createEvent, updateEvent, updateEventParticipants, uploadEventPhoto, closeEvent, deleteEvent, EVENT_POINTS } from '../lib/supabase'
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
  for (let i = 0; i < shuffled.length; i += 3) teams.push(shuffled.slice(i, i + 3))
  return teams
}

const TYPE_COLORS = { 'ACP 250': '#2E6CC7', 'ACP 500': '#C87941', 'ACP 1000': '#1A8A4A', 'WST': '#7C3AED' }
const TYPE_BG = { 'ACP 250': '#EBF2FC', 'ACP 500': '#FDF3E8', 'ACP 1000': '#F0FAF4', 'WST': '#F3F0FF' }

function Avatar({ player, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {player?.photo_url
        ? <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: size * 0.38, color: 'rgba(255,255,255,0.5)' }}>{initials(player)}</span>
      }
    </div>
  )
}

// ── Create modal ──────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', type: 'ACP 250', description: '', date: '' })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const ev = await createEvent({ name: form.name, type: form.type, description: form.description, date: form.date || null })
      toast(`Evenement "${form.name}" cree !`)
      onCreated(ev)
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(10,22,40,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          Nouvel evenement
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nom *</label>
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
          <label className="form-label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Description (optionnel)</label>
          <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Lieu, regles speciales..." rows={3} style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={!form.name.trim() || saving}>
            {saving ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────
function EditModal({ event, players, onClose, onSaved, onDeleted }) {
  const toast = useToast()
  const photoRef = useRef()
  const [form, setForm] = useState({ name: event.name, type: event.type, date: event.date || '', description: event.description || '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await updateEvent(event.id, form)
      toast('Evenement mis a jour !')
      onSaved()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setSaving(false) }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadEventPhoto(event.id, file)
      toast('Photo mise a jour !')
      onSaved()
    } catch (e) { toast('Erreur upload : ' + e.message, true) }
    finally { setUploading(false) }
  }

  async function handleDelete() {
    const msg = event.status === 'closed'
      ? 'Supprimer cet evenement ET retirer les points distribues aux joueurs ?'
      : 'Supprimer definitivement cet evenement ?'
    if (!confirm(msg)) return
    setDeleting(true)
    try {
      await deleteEvent(event, players)
      toast('Evenement supprime !')
      onDeleted()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setDeleting(false) }
  }

  const color = TYPE_COLORS[event.type] || '#2E6CC7'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(10,22,40,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          Modifier l'evenement
        </div>

        {/* Photo */}
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 72, height: 52, borderRadius: 10, background: '#0A1628', overflow: 'hidden', flexShrink: 0 }}>
              {event.photo_url && <img src={event.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <label style={{ border: '1.5px dashed #D8E4F5', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#2E6CC7', cursor: 'pointer', display: 'inline-block' }}>
              {uploading ? 'Upload...' : 'Changer la photo'}
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </label>
          </div>
        </div>

        {/* Nom */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nom *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={50} />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {EVENT_TYPES.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${form.type === t ? TYPE_COLORS[t] : '#D8E4F5'}`,
                background: form.type === t ? TYPE_BG[t] : '#fff',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700,
                color: form.type === t ? TYPE_COLORS[t] : '#7A94B8',
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Description</label>
          <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} style={{ resize: 'vertical' }} />
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Supprimer */}
        <div style={{ paddingTop: 12, borderTop: '1px solid #F0F4FB' }}>
          <button onClick={handleDelete} disabled={deleting} style={{
            width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer',
            background: '#FFF0F0', color: '#C0392B', border: '1.5px solid #F5C0C0',
            fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700,
            transition: 'all 0.15s',
          }}>
            {deleting ? 'Suppression...' : event.status === 'closed'
              ? 'Supprimer et retirer les points'
              : 'Supprimer cet evenement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Event detail ──────────────────────────────────────────
function EventDetail({ event, players, onBack, onRefresh }) {
  const toast = useToast()
  const meId = localStorage.getItem(ME_KEY)
  const [randomTeams, setRandomTeams] = useState(null)
  const [closing, setClosing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [tab, setTab] = useState('classement')
  const [eventMatches, setEventMatches] = useState([])

  const participants = event.participants || []
  const isClosed = event.status === 'closed'
  const points = EVENT_POINTS[event.type] || [25, 15, 10]
  const color = TYPE_COLORS[event.type] || '#2E6CC7'

  useEffect(() => {
    // Charge les matchs de cet évènement
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('matches').select('*').eq('event_id', event.id).then(({ data }) => {
        setEventMatches(data || [])
      })
    })
  }, [event.id])

  // Calcule V/D en live pour chaque participant
  const liveStats = {}
  participants.forEach(id => { liveStats[id] = { wins: 0, losses: 0 } })
  eventMatches.forEach(m => {
    const winners = m.winner === 'A' ? m.team_a : m.team_b
    const losers = m.winner === 'A' ? m.team_b : m.team_a
    ;(winners || []).forEach(id => { if (liveStats[id]) liveStats[id].wins++ })
    ;(losers || []).forEach(id => { if (liveStats[id]) liveStats[id].losses++ })
  })
  const liveRanked = [...participants]
    .filter(id => players.find(p => p.id === id))
    .sort((a, b) => {
      const diff = (liveStats[b]?.wins || 0) - (liveStats[a]?.wins || 0)
      if (diff !== 0) return diff
      return (liveStats[b]?.losses || 0) - (liveStats[a]?.losses || 0)
    })

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
    if (!confirm('Cloture et distribue les points bonus ?')) return
    setClosing(true)
    try {
      await closeEvent(event, players)
      toast('Evenement cloture !')
      onRefresh()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setClosing(false) }
  }

  return (
    <>
      {showEdit && (
        <EditModal
          event={event}
          players={players}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onRefresh() }}
          onDeleted={() => { setShowEdit(false); onBack(); onRefresh() }}
        />
      )}

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2E6CC7', fontWeight: 700, fontSize: 13, fontFamily: "'Barlow', sans-serif", marginBottom: 20, padding: '6px 0' }}>
        <span style={{ fontSize: 18 }}>←</span> Retour
      </button>

      {/* Header */}
      <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, position: 'relative', background: '#0A1628', minHeight: 160 }}>
        {event.photo_url && <img src={event.photo_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />}
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
            <button onClick={() => setShowEdit(true)} style={{
              border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px',
              fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.1)', cursor: 'pointer', flexShrink: 0,
            }}>
              Modifier
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {points.slice(0, 3).map((p, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {['🥇', '🥈', '🥉'][i]} +{p} pts
              </span>
            ))}
            <span style={{ background: isClosed ? 'rgba(91,191,122,0.3)' : 'rgba(255,200,0,0.2)', border: `1px solid ${isClosed ? '#5BBF7A' : '#F5C842'}`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: isClosed ? '#5BBF7A' : '#F5C842' }}>
              {isClosed ? 'Termine' : 'En cours'}
            </span>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F4F8FE', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'classement', label: 'Classement' },
          { id: 'participants', label: 'Participants' },
          { id: 'equipes', label: 'Equipes' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t.id ? '#fff' : 'transparent',
            boxShadow: tab === t.id ? '0 1px 4px rgba(10,22,40,0.1)' : 'none',
            fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 700,
            color: tab === t.id ? '#0A1628' : '#7A94B8',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Classement live */}
      {tab === 'classement' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            {isClosed ? 'Classement final' : `Classement en direct · ${eventMatches.length} match${eventMatches.length > 1 ? 's' : ''}`}
          </div>
          {liveRanked.length === 0 ? (
            <div style={{ fontSize: 14, color: '#7A94B8', textAlign: 'center', padding: '24px 0' }}>
              Aucun participant pour le moment
            </div>
          ) : (
            liveRanked.map((id, i) => {
              const p = players.find(pl => pl.id === id)
              const stats = liveStats[id] || { wins: 0, losses: 0 }
              const total = stats.wins + stats.losses
              const wr = total > 0 ? Math.round(100 * stats.wins / total) : 0
              const isTop3 = i < 3
              const rowColor = i === 0 ? '#F5C842' : i === 1 ? '#AAA' : i === 2 ? '#C87941' : color
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 0', borderBottom: '1px solid #F0F4FB',
                  background: i === 0 ? 'linear-gradient(90deg, rgba(245,200,66,0.07), transparent)' : 'none',
                }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26,
                    color: rowColor, minWidth: 36, textAlign: 'center',
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <Avatar player={p} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: '#0A1628', letterSpacing: 0.3 }}>{p?.first_name || p?.name || '?'}</div>
                    <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 1 }}>{wr}% win rate · {total} match{total > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 900, color: '#1A8A4A' }}>{stats.wins}V</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 900, color: '#C0392B' }}>{stats.losses}D</span>
                  </div>
                  {isTop3 && (
                    <span style={{ fontSize: 13, fontWeight: 700, background: rowColor, color: i === 0 ? '#0A1628' : '#fff', borderRadius: 6, padding: '3px 10px', minWidth: 60, textAlign: 'center' }}>
                      +{points[i] || 0} pts
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Participants */}
      {tab === 'participants' && (
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Participants ({participants.length})
        </div>
        {players.filter(p => !p.is_guest).map(p => {
          const present = participants.includes(p.id)
          const isMe = p.id === meId
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F0F4FB' }}>
              <Avatar player={p} size={36} />
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
                  {present ? 'Present' : '+ Rejoindre'}
                </button>
              )}
              {isClosed && present && <span style={{ fontSize: 12, color: '#1A8A4A', fontWeight: 700 }}>✓</span>}
            </div>
          )
        })}
      </div>
      )}

      {/* Equipes aleatoires */}
      {tab === 'equipes' && (
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Equipes aleatoires
        </div>
        {participants.length < 6 ? (
          <div style={{ fontSize: 13, color: '#7A94B8', textAlign: 'center', padding: '16px 0' }}>
            {6 - participants.length} participant{6 - participants.length > 1 ? 's' : ''} manquant{6 - participants.length > 1 ? 's' : ''} pour generer des equipes
          </div>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => setRandomTeams(makeTeams(participants))}>
              Generer les equipes
            </button>
            {randomTeams && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {randomTeams.map((team, i) => (
                  <div key={i} style={{ background: '#F4F8FE', borderRadius: 10, padding: '12px 14px', border: '1px solid #D8E4F5' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Equipe {i + 1}{team.length < 3 ? ` (${team.length} joueurs)` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {team.map(id => {
                        const p = players.find(pl => pl.id === id)
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D8E4F5', borderRadius: 8, padding: '5px 10px' }}>
                            <Avatar player={p} size={24} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{p?.first_name || p?.name || '?'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {!isClosed && (
        <button className="btn btn-full" onClick={handleClose} disabled={closing || participants.length < 2}
          style={{ background: '#0A1628', color: '#fff', marginTop: 8 }}>
          {closing ? 'Cloture en cours...' : 'Cloture et distribuer les points'}
        </button>
      )}
    </>
  )
}

// ── Event card ────────────────────────────────────────────
function EventCard({ event, players, onClick }) {
  const color = TYPE_COLORS[event.type] || '#2E6CC7'
  const participants = event.participants || []
  const isClosed = event.status === 'closed'

  const topWins = event.standings?.[0]?.wins || 0
  const winners = (event.standings || []).filter(s => (s.wins || 0) === topWins)
  const singleWinner = winners.length === 1
  const winnerPlayer = singleWinner ? players?.find(p => p.id === winners[0]?.id) : null

  return (
    <div onClick={onClick} style={{
      borderRadius: 18, overflow: 'hidden', position: 'relative',
      background: isClosed ? '#111827' : '#0A1628',
      minHeight: isClosed ? 130 : 150, cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      border: isClosed ? '1.5px solid #1E2A3A' : `1.5px solid ${color}`,
      boxShadow: isClosed ? '0 2px 8px rgba(0,0,0,0.3)' : `0 6px 24px ${color}44`,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isClosed ? '0 6px 20px rgba(0,0,0,0.4)' : `0 10px 32px ${color}66` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isClosed ? '0 2px 8px rgba(0,0,0,0.3)' : `0 6px 24px ${color}44` }}
    >
      {/* Background photo — event photo always visible */}
      {event.photo_url && (
        <img src={event.photo_url} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: isClosed ? 0.35 : 0.28,
        }} />
      )}

      {/* Dark overlay to keep text readable */}
      <div style={{ position: 'absolute', inset: 0, background: isClosed
        ? 'linear-gradient(120deg, rgba(17,24,39,0.82) 0%, rgba(17,24,39,0.5) 55%, rgba(17,24,39,0.1) 100%)'
        : `linear-gradient(120deg, rgba(10,22,40,0.80) 0%, rgba(10,22,40,0.4) 60%, transparent 100%)`
      }} />

      {/* Color tint */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color}22 0%, transparent 50%)` }} />

      {/* Winner photo — right side, floats above event photo */}
      {isClosed && singleWinner && winnerPlayer?.photo_url && (
        <>
          {/* Winner photo */}
          <img
            src={winnerPlayer.photo_url}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%',
              objectFit: 'cover', objectPosition: 'top',
              zIndex: 2,
            }}
          />
          {/* Fade winner photo into event background — left side */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '48%',
            background: 'linear-gradient(to right, #111827 0%, rgba(17,24,39,0.9) 20%, rgba(17,24,39,0.5) 45%, rgba(17,24,39,0.1) 70%, transparent 100%)',
            zIndex: 3,
          }} />
          {/* Bottom fade on winner */}
          <div style={{
            position: 'absolute', right: 0, bottom: 0, width: '32%', height: '45%',
            background: 'linear-gradient(to top, rgba(17,24,39,0.95) 0%, transparent 100%)',
            zIndex: 4,
          }} />
          {/* Winner name */}
          <div style={{ position: 'absolute', right: 0, bottom: 10, width: '32%', textAlign: 'center', zIndex: 5, padding: '0 6px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: '#F5C842', textShadow: '0 2px 12px rgba(0,0,0,1)', lineHeight: 1, letterSpacing: 0.5 }}>
              {winnerPlayer.first_name || winnerPlayer.name}
            </div>
            <div style={{ fontSize: 16, marginTop: 2 }}>🥇</div>
          </div>
        </>
      )}

      {/* Multiple winners */}
      {isClosed && !singleWinner && winners.length > 0 && (
        <div style={{ position: 'absolute', right: 16, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, zIndex: 2 }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>🥇</div>
          {winners.map(w => {
            const wp = players?.find(p => p.id === w.id)
            return (
              <div key={w.id} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: '#F5C842', textShadow: '0 2px 10px rgba(0,0,0,0.95)', whiteSpace: 'nowrap' }}>
                {wp?.first_name || wp?.name || '?'}
              </div>
            )
          })}
        </div>
      )}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '20px 22px', paddingRight: isClosed ? (singleWinner && winnerPlayer?.photo_url ? '50%' : winners.length > 0 ? '45%' : 22) : 22 }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '4px 14px', fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{event.type}</span>
          {isClosed
            ? <span style={{ background: 'rgba(91,191,122,0.15)', color: '#5BBF7A', border: '1px solid rgba(91,191,122,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>✓ Terminé</span>
            : <span style={{ background: 'rgba(245,200,66,0.12)', color: '#F5C842', border: '1px solid rgba(245,200,66,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>⏳ En cours</span>
          }
        </div>

        {/* Name */}
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: isClosed ? 24 : 32, color: '#fff', letterSpacing: 1, lineHeight: 1, marginBottom: 6 }}>{event.name}</div>

        {/* Date */}
        {event.date && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: isClosed ? 14 : 18, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}

        {/* Participants + points */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {participants.length} participant{participants.length > 1 ? 's' : ''}
          </span>
          {!isClosed && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(EVENT_POINTS[event.type] || []).slice(0, 3).map((p, i) => (
                <span key={i} style={{ fontSize: 12, color: i === 0 ? '#F5C842' : 'rgba(255,255,255,0.4)', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {['🥇', '🥈', '🥉'][i]}+{p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function Evenements() {
  const [events, setEvents] = useState(null)
  const [players, setPlayers] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = () => Promise.all([getEvents(), getPlayers()]).then(([e, p]) => {
    setEvents(e)
    setPlayers(p)
    if (selected) setSelected(prev => e.find(ev => ev.id === prev?.id) || null)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Évènements</div>
        <button onClick={() => setShowCreate(true)} style={{
          width: 44, height: 44, borderRadius: '50%', background: '#2E6CC7', color: '#fff',
          border: 'none', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 16px rgba(46,108,199,0.5)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >+</button>
      </div>

      {events.length === 0 && <div className="empty">Aucun évènement. Clique sur "+" pour commencer !</div>}

      {/* En cours */}
      {ongoing.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: '#2E6CC7' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: '#2E6CC7', textTransform: 'uppercase', letterSpacing: 2 }}>En cours</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#2E6CC7', background: '#EBF2FC', borderRadius: 20, padding: '2px 10px' }}>{ongoing.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ongoing.map(ev => <EventCard key={ev.id} event={ev} players={players} onClick={() => setSelected(ev)} />)}
          </div>
        </div>
      )}

      {/* Terminés */}
      {closed.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: '#4A5568' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: '#4A5568', textTransform: 'uppercase', letterSpacing: 2 }}>Terminés</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '2px 10px' }}>{closed.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.85 }}>
            {closed.map(ev => <EventCard key={ev.id} event={ev} players={players} onClick={() => setSelected(ev)} />)}
          </div>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={ev => { setShowCreate(false); load(); setSelected(ev) }} />}
    </main>
  )
}
