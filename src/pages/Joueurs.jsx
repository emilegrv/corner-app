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

  function chooseMе(id) {
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
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setSaving(false) }
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
    } catch (e) {
      toast('Erreur upload : ' + e.message, true)
    } finally { setUploading(false) }
  }

  async function handleAdd() {
    if (!newPlayer.first_name.trim()) return
    setSaving(true)
    try {
      await addPlayer(newPlayer)
      toast(`${newPlayer.first_name} ajouté !`)
      setNewPlayer({ first_name: '', last_name: '', nickname: '' })
      load()
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setSaving(false) }
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

  return (
    <main className="page">
      <div className="page-title">Joueurs</div>

      {/* "C'est moi" section */}
      <div style={{ background: '#0A1628', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
          {me ? `Mon profil — ${formatName(me)}` : 'Qui es-tu ?'}
        </div>

        {me ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                border: '2px solid #2E6CC7', background: '#1A3A6B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
              }} onClick={() => fileRef.current?.click()}>
                {me.photo_url
                  ? <img src={me.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>{initials(me)}</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Photo de profil</div>
                <label style={{
                  display: 'inline-block',
                  border: '1.5px dashed rgba(255,255,255,0.3)',
                  borderRadius: 8, padding: '7px 14px',
                  fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  {uploading ? 'Upload...' : 'Changer la photo'}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </label>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>JPG ou PNG · max 3 Mo</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'first_name', label: 'Prénom' },
                { key: 'last_name', label: 'Nom' },
                { key: 'nickname', label: 'Surnom' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  <input
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 7, padding: '8px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 13 }}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveMe} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Clique sur <strong style={{ color: '#fff' }}>"C'est moi"</strong> à côté de ton nom dans la liste ci-dessous.
          </div>
        )}
      </div>

      {/* Player list */}
      {players.length === 0 ? (
        <div className="empty" style={{ marginBottom: 16 }}>Aucun joueur. Ajoutez-en ci-dessous !</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {players.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', border: '1px solid #D8E4F5',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#1A3A6B', border: '2px solid #2E6CC7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {p.photo_url
                  ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>{initials(p)}</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {formatName(p)}
                  {p.id === meId && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#1A8A4A', color: '#fff', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moi</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#7A94B8', marginTop: 1 }}>
                  {p.elo || 1000} pts · {p.wins || 0}V · {p.losses || 0}D
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {p.id !== meId && (
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => chooseMе(p.id)}>
                    C'est moi
                  </button>
                )}
                <button className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleDelete(p.id)}>
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add player */}
      <div className="card">
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#0A1628', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          + Ajouter un joueur
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[
            { key: 'first_name', label: 'Prénom *' },
            { key: 'last_name', label: 'Nom' },
            { key: 'nickname', label: 'Surnom' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <input
                className="input"
                value={newPlayer[key]}
                onChange={e => setNewPlayer(n => ({ ...n, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={label.replace(' *', '')}
                maxLength={30}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={!newPlayer.first_name.trim() || saving}>
          {saving ? 'Ajout...' : 'Ajouter ce joueur'}
        </button>
      </div>
    </main>
  )
}
