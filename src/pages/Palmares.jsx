import React, { useEffect, useState, useRef } from 'react'
import { getSeasons, getPlayers, archiveSeason, getUne, saveUne, uploadUnePhoto } from '../lib/supabase'
import { useToast } from '../App'

function formatName(p) {
  if (!p) return '?'
  const parts = []
  if (p.first_name) parts.push(p.first_name)
  if (p.nickname) parts.push(`"${p.nickname}"`)
  if (p.last_name) parts.push(p.last_name)
  return parts.length > 0 ? parts.join(' ') : p.name || '?'
}

function winRate(p) {
  const t = (p.wins || 0) + (p.losses || 0)
  return t > 0 ? Math.round(100 * p.wins / t) : 0
}

const SEASON_RESET_DAY = 21
const SEASON_RESET_MONTH = 10

function getCurrentSeasonYear() {
  const now = new Date()
  const resetThisYear = new Date(now.getFullYear(), SEASON_RESET_MONTH - 1, SEASON_RESET_DAY)
  return now >= resetThisYear ? now.getFullYear() : now.getFullYear() - 1
}

function isResetDay() {
  const now = new Date()
  return now.getDate() === SEASON_RESET_DAY && now.getMonth() + 1 === SEASON_RESET_MONTH
}

export default function Palmares() {
  const toast = useToast()
  const [seasons, setSeasons] = useState(null)
  const [players, setPlayers] = useState([])
  const [archiving, setArchiving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  // Une
  const [une, setUne] = useState(null)
  const [uneTitre, setUneTitre] = useState('')
  const [uneKicker, setUneKicker] = useState('')
  const [unePreview, setUnePreview] = useState(null)
  const [uneFile, setUneFile] = useState(null)
  const [savingUne, setSavingUne] = useState(false)
  const fileRef = useRef()

  const load = () => Promise.all([getSeasons(), getPlayers(), getUne()]).then(([s, p, u]) => {
    setSeasons(s)
    setPlayers(p)
    setUne(u)
    setUneTitre(u?.titre || '')
    setUneKicker(u?.kicker || '')
    setUnePreview(u?.image_url || null)
  }).catch(e => {
    setSeasons([])
    toast('Erreur chargement : ' + e.message, true)
  })

  useEffect(() => { load() }, [])

  async function handleArchive() {
    const secretCode = window.prompt('Code secret :')
    if (secretCode === null) return
    if (secretCode !== 'berebagarre') { toast('Code incorrect', true); return }
    const confirmText = window.prompt(
      `\u26a0\ufe0f Cette action est irréversible !\n\nElle va archiver la saison ${getCurrentSeasonYear()} et remettre TOUS les ELOs à 1000.\n\nTape "ARCHIVER" pour confirmer :`
    )
    if (confirmText !== 'ARCHIVER') {
      if (confirmText !== null) toast('Archivage annulé — texte incorrect', true)
      return
    }
    setArchiving(true)
    try {
      await archiveSeason(getCurrentSeasonYear(), players)
      toast(`Saison ${getCurrentSeasonYear()} archivée !`)
      load()
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setArchiving(false) }
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setUneFile(f)
    setUnePreview(URL.createObjectURL(f))
  }

  async function handleSaveUne() {
    setSavingUne(true)
    try {
      let imageUrl = une?.image_url || null
      if (uneFile) {
        imageUrl = await uploadUnePhoto(uneFile)
      }
      await saveUne({ image_url: imageUrl, titre: uneTitre || null, kicker: uneKicker || null })
      toast('Une enregistrée !')
      setUneFile(null)
      load()
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setSavingUne(false) }
  }

  async function handleDeleteUne() {
    if (!window.confirm('Supprimer la Une ?')) return
    setSavingUne(true)
    try {
      await saveUne({ image_url: null, titre: null, kicker: null })
      setUneTitre('')
      setUneKicker('')
      setUnePreview(null)
      setUneFile(null)
      toast('Une supprimée')
      load()
    } catch (e) {
      toast('Erreur : ' + e.message, true)
    } finally { setSavingUne(false) }
  }

  if (seasons === null) return <div className="spinner" />

  const currentYear = getCurrentSeasonYear()
  const hasUne = une && une.image_url

  return (
    <main className="page">
      <div className="page-title">Palmarès</div>

      {/* ── Section Une ── */}
      <div style={{ background: '#0A1628', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
          Une de la page d'accueil
        </div>

        {/* Preview */}
        {unePreview && (
          <div style={{ position: 'relative', marginBottom: 16, borderRadius: 10, overflow: 'hidden', maxHeight: 240 }}>
            <img
              src={unePreview}
              alt="Preview Une"
              style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(10,22,40,0.95))',
              padding: '16px 14px 12px',
            }}>
              {uneTitre && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1 }}>
                  {uneTitre}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload photo */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Photo (portrait recommandé)
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '1.5px dashed rgba(46,108,199,0.4)',
              borderRadius: 10,
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(46,108,199,0.04)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(46,108,199,0.7)'; e.currentTarget.style.background = 'rgba(46,108,199,0.09)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(46,108,199,0.4)'; e.currentTarget.style.background = 'rgba(46,108,199,0.04)' }}
          >
            <span style={{ fontSize: 22 }}>🖼️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {uneFile ? uneFile.name : 'Choisir une photo'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                JPG, PNG — format portrait conseillé
              </div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        {/* Titre */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Titre
          </div>
          <input
            className="input"
            value={uneTitre}
            onChange={e => setUneTitre(e.target.value)}
            placeholder="ex: Jérémy reprend la tête !"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        {/* Kicker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Sous-titre (optionnel)
          </div>
          <input
            className="input"
            value={uneKicker}
            onChange={e => setUneKicker(e.target.value)}
            placeholder="ex: Classement · Saison 2026"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveUne}
            disabled={savingUne || (!uneFile && !uneTitre && !une?.image_url)}
            style={{ flex: 1 }}
          >
            {savingUne ? 'Enregistrement...' : 'Enregistrer la Une'}
          </button>
          {hasUne && (
            <button
              className="btn btn-danger"
              onClick={handleDeleteUne}
              disabled={savingUne}
              style={{ paddingLeft: 14, paddingRight: 14 }}
            >
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* ── Saison en cours ── */}
      <div style={{ background: '#0A1628', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
          Saison en cours
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: '#F5C842', marginBottom: 4 }}>
          {currentYear} — {currentYear + 1}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          Se termine le 21 octobre {currentYear + 1}
        </div>

        {isResetDay() && (
          <div style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F5C842' }}>
              Jour anniversaire ! La saison peut être archivée.
            </div>
          </div>
        )}

        {!isResetDay() && (
          <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#C0392B' }}>
              La saison se termine le 21 octobre. L'archivage avant cette date remet tous les ELOs à 1000 définitivement.
            </div>
          </div>
        )}

        <button
          className="btn"
          onClick={handleArchive}
          disabled={archiving}
          style={{ background: isResetDay() ? '#F5C842' : '#fff', color: '#0A1628', fontWeight: 700, border: isResetDay() ? 'none' : '1.5px solid #C0392B' }}
        >
          {archiving ? 'Archivage...' : `Archiver la saison ${currentYear}`}
        </button>
      </div>

      {/* ── Saisons archivées ── */}
      {seasons.length === 0 ? (
        <div className="empty">Aucune saison archivée pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {seasons.map(s => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #D8E4F5', overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#F5C842', minWidth: 60 }}>
                  {s.year}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏆 {s.champion_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#7A94B8', marginTop: 2 }}>
                    {s.champion_elo} pts en fin de saison
                  </div>
                </div>
                <div style={{ fontSize: 18, color: '#7A94B8' }}>{expanded === s.id ? '▲' : '▼'}</div>
              </div>

              {expanded === s.id && s.snapshot && (
                <div style={{ borderTop: '1px solid #D8E4F5', padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#7A94B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    Classement final
                  </div>
                  {[...s.snapshot].sort((a, b) => b.elo - a.elo).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F0F4FB' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: '#2E6CC7', minWidth: 28 }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#0A1628' }}>
                        {formatName(p)}
                      </div>
                      <div style={{ fontSize: 12, color: '#7A94B8' }}>
                        {p.wins}V · {p.losses}D · {winRate(p)}%
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#2E6CC7' }}>
                        {p.elo} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
