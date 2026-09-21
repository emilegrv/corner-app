/* =====================================================================
   Sanglich Corner — page Notifications
   À placer dans src/pages/Notifications.jsx
   (adapte les deux imports ci-dessous si tes chemins diffèrent)
   ===================================================================== */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  pushSupported,
  isIOS,
  isStandalone,
  permissionState,
  enablePush,
  disablePush,
  getCurrentSubscription,
  getSavedPlayerId,
  notifyEveryone,
  sendPush
} from "../lib/push";

/* Change ces 5 valeurs pour coller au thème du reste de l'app. */
const C = {
  bg: "#ffffff",
  line: "#e8edf5",
  text: "#0A1628",
  muted: "rgba(10,22,40,0.55)",
  accent: "#2E6CC7"
};

const FONT_TITRE = "'Barlow Condensed', sans-serif";

const ADMIN_CODE = "berebagarre";

export default function Notifications() {
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(getSavedPlayerId());
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "ok" | "ko", text }

  const [adminOpen, setAdminOpen] = useState(false);
  const [code, setCode] = useState("");
  const [annonceTitre, setAnnonceTitre] = useState("");
  const [annonceTexte, setAnnonceTexte] = useState("");

  const supported = pushSupported();
  const iosBlocked = isIOS() && !isStandalone();

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, first_name, nickname, is_guest")
        .order("name", { ascending: true });
      if (alive && data) setPlayers(data.filter((p) => !p.is_guest));

      const sub = await getCurrentSubscription();
      if (alive) setSubscribed(Boolean(sub) && permissionState() === "granted");
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleToggle() {
    setBusy(true);
    setNotice(null);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        setNotice({ kind: "ok", text: "Notifications coupées sur cet appareil." });
      } else {
        await enablePush(playerId);
        setSubscribed(true);
        setNotice({ kind: "ok", text: "C'est activé. Tu recevras les notifs du Sanglich." });
      }
    } catch (err) {
      setNotice({ kind: "ko", text: err.message || "Quelque chose a raté." });
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setNotice(null);
    const res = await sendPush({
      title: "Test Sanglich",
      body: "Si tu lis ça, tout marche.",
      playerIds: [playerId],
      tag: "test"
    });
    setBusy(false);
    setNotice(
      res && res.sent > 0
        ? { kind: "ok", text: "Envoyée. Elle arrive dans quelques secondes." }
        : { kind: "ko", text: "Rien n'est parti. Regarde la console du navigateur." }
    );
  }

  async function handleBroadcast() {
    if (!annonceTitre.trim()) {
      setNotice({ kind: "ko", text: "Il faut au moins un titre." });
      return;
    }
    setBusy(true);
    const res = await notifyEveryone({
      title: annonceTitre.trim(),
      body: annonceTexte.trim()
    });
    setBusy(false);
    if (res) {
      setAnnonceTitre("");
      setAnnonceTexte("");
      setNotice({ kind: "ok", text: `Envoyée à ${res.sent} appareil(s).` });
    } else {
      setNotice({ kind: "ko", text: "L'envoi a échoué." });
    }
  }

  return (
    <div style={S.page}>
      <h1 style={S.title}>Notifications</h1>
      <p style={S.intro}>
        {"Active les notifs pour être prévenu quand un match où tu joues est enregistré, quand quelqu'un te double au classement, et quand un évènement est créé."}
      </p>

      {!supported && (
        <div style={S.warn}>
          {"Ce navigateur ne gère pas les notifications push. Essaie Chrome, Firefox ou Safari à jour."}
        </div>
      )}

      {supported && iosBlocked && (
        <div style={S.warn}>
          <strong style={S.warnTitle}>Sur iPhone, une étape avant</strong>
          <ol style={S.list}>
            <li>{"Bouton Partager en bas de Safari"}</li>
            <li>{"Ajouter à l'écran d'accueil"}</li>
            <li>{"Ouvre Sanglich Corner depuis la nouvelle icône, puis reviens ici"}</li>
          </ol>
        </div>
      )}

      {supported && !iosBlocked && (
        <>
          <section style={S.card}>
            <h2 style={S.h2}>Qui es-tu ?</h2>
            <div style={S.grid}>
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlayerId(p.id)}
                  disabled={subscribed}
                  style={{
                    ...S.chip,
                    ...(String(playerId) === String(p.id) ? S.chipOn : null),
                    ...(subscribed ? S.chipLocked : null)
                  }}
                >
                  {p.first_name || p.name}
                  {p.nickname ? " « " + p.nickname + " »" : ""}
                </button>
              ))}
            </div>
            {subscribed && (
              <p style={S.hint}>
                {"Coupe les notifications si tu veux changer de joueur sur cet appareil."}
              </p>
            )}
          </section>

          <button
            onClick={handleToggle}
            disabled={busy || (!playerId && !subscribed)}
            style={{ ...S.cta, ...(subscribed ? S.ctaOff : null) }}
          >
            {busy
              ? "Une seconde..."
              : subscribed
              ? "Couper les notifications"
              : "Activer les notifications"}
          </button>

          {subscribed && (
            <button onClick={handleTest} disabled={busy} style={S.ghost}>
              {"M'envoyer une notification de test"}
            </button>
          )}
        </>
      )}

      {notice && (
        <div style={notice.kind === "ok" ? S.ok : S.ko}>{notice.text}</div>
      )}

      {/* ---------- Annonce à tout le monde ---------- */}
      <section style={{ ...S.card, marginTop: 32 }}>
        <h2 style={S.h2}>Annonce à tout le Sanglich</h2>

        {!adminOpen ? (
          <div style={S.row}>
            <input
              type="password"
              value={code}
              placeholder="Code"
              onChange={(e) => setCode(e.target.value)}
              style={S.input}
            />
            <button
              onClick={() => {
                if (code === ADMIN_CODE) {
                  setAdminOpen(true);
                  setNotice(null);
                } else {
                  setNotice({ kind: "ko", text: "Mauvais code." });
                }
              }}
              style={S.small}
            >
              Ouvrir
            </button>
          </div>
        ) : (
          <>
            <input
              value={annonceTitre}
              placeholder="Titre, par exemple : Corner ce soir"
              onChange={(e) => setAnnonceTitre(e.target.value)}
              style={{ ...S.input, width: "100%", marginBottom: 8 }}
            />
            <textarea
              value={annonceTexte}
              placeholder="Message, par exemple : 21h chez Jérémy, ramenez des bières"
              onChange={(e) => setAnnonceTexte(e.target.value)}
              rows={3}
              style={{ ...S.input, width: "100%", marginBottom: 12, resize: "vertical" }}
            />
            <button onClick={handleBroadcast} disabled={busy} style={S.cta}>
              {busy ? "Envoi..." : "Envoyer à tout le monde"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const S = {
  page: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "24px 16px 96px",
    color: C.text,
    fontFamily: "inherit"
  },
  title: {
    fontFamily: FONT_TITRE,
    fontSize: 34,
    fontWeight: 600,
    margin: "0 0 8px"
  },
  intro: { fontSize: 15, lineHeight: 1.5, color: C.muted, margin: "0 0 24px" },
  card: {
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    background: C.bg
  },
  h2: {
    fontFamily: FONT_TITRE,
    fontSize: 18,
    fontWeight: 500,
    margin: "0 0 12px"
  },
  grid: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${C.line}`,
    background: "transparent",
    color: C.text,
    font: "inherit",
    fontSize: 14,
    cursor: "pointer"
  },
  chipOn: { background: C.accent, borderColor: C.accent, color: "#fff" },
  chipLocked: { opacity: 0.55, cursor: "default" },
  hint: { fontSize: 13, color: C.muted, margin: "12px 0 0" },
  cta: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    background: C.accent,
    color: "#fff",
    fontFamily: FONT_TITRE,
    fontSize: 16,
    letterSpacing: 0.3,
    cursor: "pointer"
  },
  ctaOff: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
  ghost: {
    width: "100%",
    marginTop: 8,
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: "transparent",
    color: C.muted,
    font: "inherit",
    fontSize: 14,
    cursor: "pointer"
  },
  small: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: C.accent,
    color: "#fff",
    font: "inherit",
    cursor: "pointer"
  },
  row: { display: "flex", gap: 8 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    font: "inherit",
    fontSize: 15,
    background: "transparent",
    color: C.text,
    boxSizing: "border-box"
  },
  warn: {
    border: `1px solid ${C.line}`,
    borderLeft: `4px solid ${C.accent}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 1.5
  },
  warnTitle: { display: "block", marginBottom: 8, fontSize: 15 },
  list: { margin: 0, paddingLeft: 20 },
  ok: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    background: "#f1f7f1",
    color: "#1e6b34",
    fontSize: 14
  },
  ko: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    background: "#fdf1f1",
    color: "#a12222",
    fontSize: 14
  }
};
