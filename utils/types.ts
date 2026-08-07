// utils/types.ts

export type Mode =
  | "normal"
  | "organizacion"
  | "ventas"
  | "contenidos"
  | "ciberdemia";

// =========================
// CHAT - Fuente de verdad
// =========================

export type ChatRole = "user" | "assistant" | "system";

/**
 * Mensaje tal como viene del BACKEND (API).
 */
export type BackendChatMessage = {
  id?: string;
  role: ChatRole;
  content: string;
  created_at: string; // ISO string (siempre)
};

/**
 * Mensaje tal como lo usa el UI del móvil (FlatList).
 */
export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  createdAt: string;
};

/**
 * Convierte un mensaje del backend al formato del UI.
 */
export function backendToUiMessage(m: BackendChatMessage): ChatMessage {
  return {
    id: m.id ?? `${m.role}-${m.created_at}`, // ← CLAVE ÚNICA REAL
    text: m.content,
    sender: m.role === "user" ? "user" : "assistant",
    createdAt: m.created_at,
  };
}



