/* =====================================================================
   Sanglich Corner — envoi des notifications push
   À placer dans /api/notify.js à la racine du repo (pas dans src/)
   Vercel le détecte automatiquement comme fonction serverless.
   ===================================================================== */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  "mailto:sanglich@corner.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (
    process.env.NOTIFY_SECRET &&
    req.headers["x-notify-secret"] !== process.env.NOTIFY_SECRET
  ) {
    return res.status(401).json({ error: "Clé manquante ou invalide" });
  }

  const {
    title,
    body,
    url,
    tag,
    playerIds,
    excludePlayerIds
  } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: "Il faut au moins un titre" });
  }

  // --- Récupération des abonnements concernés -------------------------
  let query = supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, player_id");

  if (Array.isArray(playerIds) && playerIds.length > 0) {
    query = query.in("player_id", playerIds);
  }

  const { data: subs, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const exclude = new Set(
    Array.isArray(excludePlayerIds) ? excludePlayerIds.map(String) : []
  );
  const targets = (subs || []).filter((s) => !exclude.has(String(s.player_id)));

  if (targets.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, total: 0 });
  }

  // --- Envoi ----------------------------------------------------------
  const payload = JSON.stringify({
    title,
    body: body || "",
    url: url || "/",
    tag: tag || "sanglich"
  });

  const stale = [];
  let sent = 0;

  await Promise.all(
    targets.map(async (s) => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      };
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 3600,
          urgency: "normal"
        });
        sent += 1;
      } catch (err) {
        // 404 / 410 = abonnement mort (app désinstallée, navigateur réinitialisé)
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(s.endpoint);
        } else {
          console.error("Échec envoi push", err.statusCode, err.body);
        }
      }
    })
  );

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return res.status(200).json({
    sent,
    removed: stale.length,
    total: targets.length
  });
}
