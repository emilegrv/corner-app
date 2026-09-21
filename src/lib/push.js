/* =====================================================================
   Sanglich Corner — helpers notifications push
   À placer dans src/lib/push.js
   =====================================================================

   DEUX CHOSES À VÉRIFIER AVANT DE PUSH :

   1) L'import du client Supabase juste en dessous. Adapte le chemin au
      tien (souvent "../supabaseClient" ou "./supabase").

   2) Les noms de colonnes de la table players. Ce fichier suppose
      { id, name, elo }. Si chez toi c'est { id, nom, elo }, remplace
      p.name par p.nom dans snapshotRanking() et notifyMatch().
   ===================================================================== */

import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || "";
const STORAGE_KEY = "sanglich_push_player";

/* ------------------------------------------------------------------ */
/* Détection de l'environnement                                        */
/* ------------------------------------------------------------------ */

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function permissionState() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

/* ------------------------------------------------------------------ */
/* Mémoire du joueur sur cet appareil                                  */
/* ------------------------------------------------------------------ */

export function getSavedPlayerId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function savePlayerId(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* mode privé, on ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Abonnement / désabonnement                                          */
/* ------------------------------------------------------------------ */

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerSW() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush(playerId) {
  if (!pushSupported()) {
    throw new Error("Ce navigateur ne gère pas les notifications push.");
  }
  if (!playerId) {
    throw new Error("Choisis ton joueur avant d'activer les notifications.");
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("Clé VAPID absente. Vérifie VITE_VAPID_PUBLIC_KEY sur Vercel.");
  }
  if (isIOS() && !isStandalone()) {
    throw new Error(
      "Sur iPhone, ajoute d'abord Sanglich Corner à ton écran d'accueil, puis ouvre l'app depuis cette icône."
    );
  }

  const reg = await registerSW();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Notifications refusées. Réactive-les dans les réglages du navigateur pour ce site."
    );
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      player_id: playerId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: (navigator.userAgent || "").slice(0, 250)
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;

  savePlayerId(playerId);
  return sub;
}

export async function disablePush() {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  await sub.unsubscribe();
}

/* ------------------------------------------------------------------ */
/* Envoi                                                               */
/* ------------------------------------------------------------------ */

/**
 * Ne lève jamais d'erreur : si l'envoi échoue, on log et on continue.
 * Une notif ratée ne doit pas faire planter l'enregistrement d'un match.
 */
export async function sendPush({
  title,
  body,
  url = "/",
  tag,
  playerIds,
  excludePlayerIds
}) {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notify-secret": NOTIFY_SECRET
      },
      body: JSON.stringify({ title, body, url, tag, playerIds, excludePlayerIds })
    });
    if (!res.ok) {
      console.warn("Notification non envoyée:", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("Notification non envoyée:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Déclencheurs                                                        */
/* ------------------------------------------------------------------ */

const isRealPlayer = (id) => id && !String(id).startsWith("__guest__");

/** 1. Un match vient d'être enregistré : on prévient ceux qui y jouaient. */
export async function notifyMatch({
  teamA = [],
  teamB = [],
  scoreA,
  scoreB,
  enteredById = null
}) {
  const label = (team) => team.map((p) => p.name).join(", ");
  const ids = [...teamA, ...teamB].map((p) => p.id).filter(isRealPlayer);
  if (ids.length === 0) return null;

  return sendPush({
    title: "Nouveau match enregistré",
    body: `${label(teamA)}  ${scoreA} - ${scoreB}  ${label(teamB)}`,
    url: "/historique",
    tag: "match",
    playerIds: ids,
    excludePlayerIds: enteredById ? [enteredById] : []
  });
}

/** Photographie du classement, à appeler avant ET après le recalcul ELO. */
export function snapshotRanking(players = []) {
  return players
    .filter((p) => isRealPlayer(p.id))
    .map((p) => ({ id: p.id, name: p.name, elo: Number(p.elo) || 0 }));
}

/** Compare deux photographies et renvoie la liste des dépassements. */
export function computeOvertakes(before = [], after = []) {
  const rankMap = (list) => {
    const sorted = [...list].sort((a, b) => b.elo - a.elo);
    const map = new Map();
    sorted.forEach((p, i) => map.set(String(p.id), i));
    return map;
  };
  const nameMap = new Map(after.map((p) => [String(p.id), p.name]));
  const rBefore = rankMap(before);
  const rAfter = rankMap(after);
  const out = [];

  for (const [id, posBefore] of rBefore.entries()) {
    const posAfter = rAfter.get(id);
    if (posAfter == null) continue;
    for (const [otherId, otherBefore] of rBefore.entries()) {
      if (otherId === id) continue;
      const otherAfter = rAfter.get(otherId);
      if (otherAfter == null) continue;
      // "id" était devant "otherId", il est maintenant derrière
      if (posBefore < otherBefore && posAfter > otherAfter) {
        out.push({
          passedId: id,
          passerId: otherId,
          passerName: nameMap.get(otherId) || "Quelqu'un",
          newRank: posAfter + 1
        });
      }
    }
  }
  return out;
}

/** 2. Quelqu'un s'est fait doubler au classement. */
export async function notifyOvertakes(before, after) {
  const overtakes = computeOvertakes(before, after);
  await Promise.all(
    overtakes.map((o) =>
      sendPush({
        title: "Tu viens de te faire doubler",
        body: `${o.passerName} est passé devant toi. Tu es ${o.newRank}e au classement.`,
        url: "/classement",
        tag: `classement-${o.passedId}`,
        playerIds: [o.passedId]
      })
    )
  );
  return overtakes;
}

/** 3. Un nouvel évènement vient d'être créé : tout le monde est prévenu. */
export async function notifyNewEvent({ name, type }) {
  return sendPush({
    title: "Nouvel évènement",
    body: type ? `${name} — ${type}. Inscris-toi.` : `${name} vient d'être créé.`,
    url: "/evenements",
    tag: "evenement"
  });
}

/** 4. Message libre envoyé à tout le monde depuis l'app. */
export async function notifyEveryone({ title, body, url = "/" }) {
  return sendPush({ title, body, url, tag: `annonce-${Date.now()}` });
}
