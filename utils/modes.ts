// utils/modes.ts

export type Mode = "normal" | "organizacion" | "ventas" | "contenidos" | "ciberdemia";

export const MODE_LABELS: Record<Mode, string> = {
  normal: "Modo general",
  organizacion: "Organización",
  ventas: "Ventas",
  contenidos: "Contenidos",
  ciberdemia: "Ciberdemia",
};

