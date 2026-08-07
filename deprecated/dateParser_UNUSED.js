// services/dateParser.js
// Parser robusto para fechas/horas en español (local time)

function normalizarTexto(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MESES = {
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  septiembre: 8,
  setiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
};

const DIAS = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
  domingo: 0,
};

function extraerHora(texto) {
  // "a las 14", "14:30", "14.30"
  const m1 = texto.match(/\b(?:a\s+las?\s+)?(\d{1,2})[:\.](\d{2})\b/);
  if (m1) return { h: parseInt(m1[1], 10), m: parseInt(m1[2], 10) };

  const m2 = texto.match(/\b(?:a\s+las?\s+)?(\d{1,2})\b/);
  // OJO: esto puede capturar el "día 16". Por eso solo aceptamos si hay pista de hora.
  // Pista de hora: contiene "a las", "hora", "h"
  if (m2 && (texto.includes("a las") || texto.includes("hora") || texto.includes("h "))) {
    const h = parseInt(m2[1], 10);
    return { h, m: 0 };
  }

  return null;
}

function construirDateLocal(y, mo, d, hh, mm) {
  const dt = new Date(y, mo, d, hh, mm, 0, 0); // LOCAL
  if (isNaN(dt)) return null;
  return dt;
}

function siguienteDiaSemana(targetDow, ahora = new Date()) {
  // JS: dom=0..sab=6. Nuestro DIAS: lunes=1..domingo=0
  const current = ahora.getDay();
  let diff = targetDow - current;
  if (diff <= 0) diff += 7;
  const d = new Date(ahora);
  d.setDate(ahora.getDate() + diff);
  return d;
}

function parseFechaDesdeMensaje(message) {
  const texto = normalizarTexto(message);
  const ahora = new Date();

  const hora = extraerHora(texto);
  if (!hora) return null;

  // 1) "hoy/mañana/pasado mañana"
  if (texto.includes("pasado manana") || texto.includes("pasadomanana")) {
    const base = new Date(ahora);
    base.setDate(base.getDate() + 2);
    return construirDateLocal(base.getFullYear(), base.getMonth(), base.getDate(), hora.h, hora.m);
  }
  if (texto.includes("manana")) {
    const base = new Date(ahora);
    base.setDate(base.getDate() + 1);
    return construirDateLocal(base.getFullYear(), base.getMonth(), base.getDate(), hora.h, hora.m);
  }
  if (texto.includes("hoy")) {
    return construirDateLocal(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hora.h, hora.m);
  }

  // 2) "lunes/martes..."
  for (const [nombre, dow] of Object.entries(DIAS)) {
    if (texto.includes(nombre)) {
      const base = siguienteDiaSemana(dow, ahora);
      return construirDateLocal(base.getFullYear(), base.getMonth(), base.getDate(), hora.h, hora.m);
    }
  }

  // 3) "16/12" o "16-12" (con o sin año)
  const dm = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10) - 1;
    let year = ahora.getFullYear();
    if (dm[3]) {
      const y = parseInt(dm[3], 10);
      year = y < 100 ? 2000 + y : y;
    }
    return construirDateLocal(year, month, day, hora.h, hora.m);
  }

  // 4) "16 de diciembre" (o "16 diciembre")
  const md = texto.match(/\b(\d{1,2})\s*(?:de\s*)?([a-zñ]+)(?:\s*(?:de\s*)?(\d{4}))?\b/);
  if (md && MESES[md[2]] !== undefined) {
    const day = parseInt(md[1], 10);
    const month = MESES[md[2]];
    const year = md[3] ? parseInt(md[3], 10) : ahora.getFullYear();
    return construirDateLocal(year, month, day, hora.h, hora.m);
  }

  // 5) ✅ CASO CLAVE: "el dia 16" / "dia 16" / "el 16"
  // OJO: esto debe ejecutarse DESPUÉS de extraer hora y de los casos anteriores
  const dOnly = texto.match(/\b(?:el\s+dia|dia|el)\s+(\d{1,2})\b/);
  if (dOnly) {
    const day = parseInt(dOnly[1], 10);
    const month = ahora.getMonth();
    const year = ahora.getFullYear();

    // Si el día ya pasó este mes, lo interpretamos como el mes siguiente
    let y = year;
    let m = month;
    if (day < ahora.getDate()) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return construirDateLocal(y, m, day, hora.h, hora.m);
  }

  // 6) "el 16" (sin palabra dia) pero con pista de cita
  // (evita confundir con hora porque hora ya se extrajo aparte)
  const elNum = texto.match(/\b(?:el)\s+(\d{1,2})\b/);
  if (elNum && (texto.includes("cita") || texto.includes("reunion") || texto.includes("reserva"))) {
    const day = parseInt(elNum[1], 10);
    const month = ahora.getMonth();
    const year = ahora.getFullYear();

    let y = year;
    let m = month;
    if (day < ahora.getDate()) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return construirDateLocal(y, m, day, hora.h, hora.m);
  }

  return null;
}

// Extrae un “motivo” simple si viene en el mismo mensaje
function extraerProposito(message) {
  const texto = normalizarTexto(message);

  // "por un curso", "para una consulta", "sobre marketing", "porque..."
  const m = texto.match(/\b(?:por|para|sobre|porque)\s+(.*)$/);
  if (!m) return null;

  const p = (m[1] || "").trim();
  if (!p) return null;

  // corta si mete otra cosa rara
  return p.slice(0, 140);
}

module.exports = { parseFechaDesdeMensaje, extraerProposito };
