// utils/appointmentsApi.ts

import { BASE_URL } from "./services/config";

// ---------- Tipos ----------

export type Appointment = {
  id: string;
  clientId: string;

  // En tu BD lo guardas como string "YYYY-MM-DD"
  // (o puede venir ISO si lo cambiaste alguna vez)
  fecha: string;

  hora: string;      // "HH:MM"
  fechaStr?: string; // "YYYY-MM-DD" (si backend lo manda)
  status: string;

  duracion?: number;
  proposito?: string | null;
};

export type CreateAppointmentPayload = {
  clientId: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:MM"
  status?: string;
  duracion?: number;
  proposito?: string | null;
};

type RequestOptions = RequestInit & { body?: any };

// ---------- Helper genérico con timeout ----------

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  // ✅ Timeout anti-bloqueo
  const controller = new AbortController();
  const timeoutMs = 12000; // 12s
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal,
  };

  if (config.body && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(url, config);

    // Intentar parsear JSON
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.log("❌ Appointments API error:", {
        url,
        status: res.status,
        data,
      });

      const msg = (data as any)?.error || `Error al hacer la petición (${res.status})`;
      throw new Error(msg);
    }

    return data as T;
  } catch (err: any) {
    // Abort = típico cuando se queda colgado
    if (err?.name === "AbortError") {
      console.log("⏳ Timeout en request:", url);
      throw new Error("Timeout conectando con el servidor. Revisa tu conexión o el BASE_URL.");
    }

    console.log("❌ Error request appointments:", err?.message || err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- API de citas ----------

export async function getAppointments(clientId: string): Promise<Appointment[]> {
  const safeClientId = encodeURIComponent(clientId);
  const raw = await request<any>(`/api/appointments?clientId=${safeClientId}`);

  // Soportamos ambos formatos:
  // - { appointments: [...] }
  // - [...] (por si alguna ruta antigua devuelve array)
  if (Array.isArray(raw)) return raw as Appointment[];

  if (raw && Array.isArray(raw.appointments)) {
    return raw.appointments as Appointment[];
  }

  return [];
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const r = await request<{ appointment: Appointment } | Appointment>("/api/appointments", {
    method: "POST",
    body: payload,
  });

  return (r as any)?.appointment ? (r as any).appointment : (r as Appointment);
}

export async function updateAppointment(
  id: string,
  payload: Partial<Pick<Appointment, "status" | "proposito">>
): Promise<Appointment> {
  const r = await request<{ appointment: Appointment } | Appointment>(`/api/appointments/${id}`, {
    method: "PUT",
    body: payload,
  });

  return (r as any)?.appointment ? (r as any).appointment : (r as Appointment);
}
