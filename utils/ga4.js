// utils/ga4.js
const crypto = require("crypto");

/**
 * Genera un client_id estable a partir de tu clientId interno.
 * No envía PII (no emails, no teléfonos).
 */
function gaClientIdFromClientId(clientId) {
  const hex = crypto
    .createHash("sha256")
    .update(String(clientId))
    .digest("hex")
    .slice(0, 16);

  const a = parseInt(hex.slice(0, 8), 16);
  const b = parseInt(hex.slice(8, 16), 16);

  // Formato típico: "12345.67890"
  return `${a}.${b}`;
}

function boolEnv(name) {
  return String(process.env[name] || "").toLowerCase() === "true";
}

/**
 * Envío de eventos a GA4 Measurement Protocol (server-side)
 * Requisitos en Render:
 * - GA4_MEASUREMENT_ID = G-XXXXXXX
 * - GA4_API_SECRET = tu_secret
 * Opcional:
 * - GA4_DEBUG = true (para ver en DebugView durante pruebas)
 */
async function sendGAEvent(req, name, params = {}) {
  try {
    const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
    const API_SECRET = process.env.GA4_API_SECRET;

    // Nunca romper producto si falta config
    if (!MEASUREMENT_ID || !API_SECRET) return { ok: false, skipped: true };

    const useDebug = boolEnv("GA4_DEBUG");

    const endpoint = useDebug
      ? "https://www.google-analytics.com/debug/mp/collect"
      : "https://www.google-analytics.com/mp/collect";

    const url =
      `${endpoint}?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}` +
      `&api_secret=${encodeURIComponent(API_SECRET)}`;

    // Recuperamos clientId “interno” de tu app (no PII)
    const clientId =
      req?.body?.clientId ||
      req?.headers?.["x-client-id"] ||
      req?.query?.clientId ||
      "unknown_client";

    const payload = {
      client_id: gaClientIdFromClientId(clientId),
      events: [
        {
          name,
          params: {
            ...(useDebug ? { debug_mode: 1 } : {}),
            ...params,
            engagement_time_msec: 1,
          },
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    // En debug endpoint GA devuelve validaciones en JSON
    if (useDebug) {
      const data = await res.json().catch(() => null);
      return { ok: res.ok, debug: true, status: res.status, data };
    }

    return { ok: res.ok, status: res.status };
  } catch (e) {
    // Silencio: métricas jamás deben romper el producto
    return { ok: false, error: true };
  }
}

module.exports = { sendGAEvent };

