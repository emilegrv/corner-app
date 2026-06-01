import React, { useEffect, useState, useRef } from 'react'
import { getPlayers, addPlayer, deletePlayer, updatePlayer, uploadPhoto } from '../lib/supabase'
import { useToast } from '../App'

function formatName(p) {
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function initials(p) {
  const fn = p.first_name || p.name || '?'
  const ln = p.last_name || ''
  return (fn[0] + (ln[0] || fn[1] || '')).toUpperCase()
}

const ME_KEY = 'sanglich_me_id'

export default function Joueurs() {
  const toast = useToast()
  const [players, setPlayers] = useState(null)
  const [meId, setMeId] = useState(() => localStorage.getItem(ME_KEY) || null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addType, setAddType] = useState('regular')
  const fileRef = useRef()

  const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '' })
  const [newPlayer, setNewPlayer] = useState({ first_name: '', last_name: '', nickname: '' })

  const load = () => getPlayers().then(data => {
    setPlayers(data)
    if (meId) {
      const me = data.find(p => p.id === meId)
      if (me) setForm({ first_name: me.first_name || '', last_name: me.last_name || '', nickname: me.nickname || '' })
    }
  })

  useEffect(() => { load() }, [])

  const me = players?.find(p => p.id === meId)

  function chooseMe(id) {
    localStorage.setItem(ME_KEY, id)
    setMeId(id)
    const p = players.find(pl => pl.id === id)
    if (p) setForm({ first_name: p.first_name || '', last_name: p.last_name || '', nickname: p.nickname || '' })
    toast('Profil sélectionné !')
  }

  async function saveMe() {
    if (!meId) return
    setSaving(true)
    try {
      await updatePlayer(meId, form)
      toast('Profil mis à jour !')
      load()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setSaving(false) }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !meId) return
    if (file.size > 3 * 1024 * 1024) { toast('Photo trop lourde (max 3 Mo)', true); return }
    setUploading(true)
    try {
      await uploadPhoto(meId, file)
      toast('Photo mise à jour !')
      load()
    } catch (e) { toast('Erreur upload : ' + e.message, true) }
    finally { setUploading(false) }
  }

  async function handleAdd() {
    if (!newPlayer.first_name.trim()) return
    setSaving(true)
    try {
      await addPlayer({ ...newPlayer, is_guest: addType === 'guest' })
      toast(`${newPlayer.first_name} ajouté${addType === 'guest' ? ' (invité)' : ''} !`)
      setNewPlayer({ first_name: '', last_name: '', nickname: '' })
      load()
    } catch (e) { toast('Erreur : ' + e.message, true) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    const p = players.find(p => p.id === id)
    if (!confirm(`Supprimer ${formatName(p)} ?`)) return
    try {
      await deletePlayer(id)
      if (meId === id) { localStorage.removeItem(ME_KEY); setMeId(null) }
      toast('Joueur supprimé')
      load()
    } catch (e) { toast('Erreur : ' + e.message, true) }
  }

  if (players === null) return <div className="spinner" />

  const regular = players.filter(p => !p.is_guest)
  const guests = players.filter(p => p.is_guest)

  return (
    <main className="page">
      <div className="page-title">Joueurs</div>

      {/* "C'est moi" */}
      <div style={{ background: '#0A1628', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
          {me ? `Mon profil — ${formatName(me)}` : 'Qui es-tu ?'}
        </div>
        {me ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #2E6CC7', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                {me.photo_url ? <img src={me.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>{initials(me)}</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Photo de profil</div>
                <label style={{ display: 'inline-block', border: '1.5px dashed rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}>
                  {uploading ? 'Upload...' : 'Changer la photo'}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[{ key: 'first_name', label: 'Prénom' }, { key: 'last_name', label: 'Nom' }, { key: 'nickname', label: 'Surnom' }].map(({ key, label }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  <input style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 7, padding: '8px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 13 }}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveMe} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Clique sur <strong style={{ color: '#fff' }}>"C'est moi"</strong> à côté de ton nom dans la liste.
          </div>
        )}
      </div>

      {/* Regular players */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Joueurs réguliers
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {regular.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #D8E4F5', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1A3A6B', border: '2px solid #2E6CC7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {p.photo_url ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>{initials(p)}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {formatName(p)}
                {p.id === meId && <span style={{ fontSize: 10, fontWeight: 700, background: '#1A8A4A', color: '#fff', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>Moi</span>}
              </div>
              <div style={{ fontSize: 11, color: '#7A94B8', marginTop: 1 }}>{p.elo || 1000} pts · {p.wins || 0}V · {p.losses || 0}D</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {p.id !== meId && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => chooseMe(p.id)}>C'est moi</button>}
              <button className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleDelete(p.id)}>Suppr.</button>
            </div>
          </div>
        ))}
      </div>

      {/* Guest players */}
      {guests.length > 0 && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Invités (hors classement)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {guests.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFF', border: '1px dashed #D8E4F5', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#D8E4F5', border: '2px dashed #9BBDE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: '#7A94B8' }}>{initials(p)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#7A94B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {formatName(p)}
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#EBF2FC', color: '#2E6CC7', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>Invité</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#B0C4DE', marginTop: 1 }}>Hors classement</div>
                </div>
                <button className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleDelete(p.id)}>Suppr.</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add player form */}
      <div className="card">
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          + Ajouter un joueur
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[{ val: 'regular', label: 'Joueur régulier' }, { val: 'guest', label: 'Invité (hors classement)' }].map(({ val, label }) => (
            <button key={val} onClick={() => setAddType(val)} style={{
              flex: 1, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
              border: `2px solid ${addType === val ? '#2E6CC7' : '#D8E4F5'}`,
              background: addType === val ? '#EBF2FC' : '#fff',
              fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 700,
              color: addType === val ? '#2E6CC7' : '#7A94B8',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[{ key: 'first_name', label: 'Prénom *' }, { key: 'last_name', label: 'Nom' }, { key: 'nickname', label: 'Surnom' }].map(({ key, label }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <input className="input" value={newPlayer[key]} onChange={e => setNewPlayer(n => ({ ...n, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder={label.replace(' *', '')} maxLength={30} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={!newPlayer.first_name.trim() || saving}>
          {saving ? 'Ajout...' : `Ajouter ${addType === 'guest' ? "l'invité" : 'le joueur'}`}
        </button>
      </div>
    </main>
  )
}
