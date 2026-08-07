// utils/services/services.ts

import type { BackendChatMessage } from "../types";

const BASE_URL = "https://lumina-backend-5-oy8n.onrender.com";

// =========================
// CHAT
// =========================

/**
 * Obtener historial de chat
 */
export async function getChatHistory(clientId: string): Promise<BackendChatMessage[]> {
  if (!clientId) {
    throw new Error("clientId requerido en getChatHistory");
  }

  const res = await fetch(`${BASE_URL}/api/chat/history?clientId=${clientId}`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error obteniendo historial: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.messages ?? []) as BackendChatMessage[];
}

/**
 * Enviar mensaje al chat
 */
export async function sendChatMessage(
  clientId: string,
  message: string,
  mode: string = "normal"
): Promise<any> {
  if (!clientId || !message) {
    throw new Error("clientId y message son requeridos");
  }

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, message, mode }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error enviando mensaje: ${res.status} ${text}`);
  }

  return await res.json();
}
