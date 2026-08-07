// app/(tabs)/appointments.tsx  (o donde tengas AppointmentsScreen)
import React, { useCallback, useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import {
  Appointment,
  getAppointments,
  updateAppointment,
} from "../../utils/appointmentsApi";

const CLIENT_ID = "mobile_client_1";

// Habilitar animaciones de layout en Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ------------------ Helpers ------------------

function formatDateForSectionFromYMD(ymd: string): { key: string; label: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return { key: ymd, label: ymd };

  const yyyy = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const dd = parseInt(match[3], 10);

  const d = new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
  const label = d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { key: ymd, label };
}

function normalizeStatusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed" || s === "confirmada") return "Confirmed";
  if (s === "pending" || s === "pendiente") return "Pending";
  if (s === "cancelled" || s === "cancelada") return "Cancelled";
  return status || "Unknown";
}

function getStatusStyle(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed" || s === "confirmada") return styles.chipConfirmed;
  if (s === "pending" || s === "pendiente") return styles.chipPending;
  if (s === "cancelled" || s === "cancelada") return styles.chipCancelled;
  return styles.chipDefault;
}

// ------------------ Pantalla ------------------

type RowItem = {
  id: string;
  horaTexto: string;
  status: string;
  proposito?: string | null;
  fechaStr?: string;
};

export default function AppointmentsScreen() {
  const [sections, setSections] = useState<{ title: string; data: RowItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal edición de motivo (cross-platform)
  const [editVisible, setEditVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RowItem | null>(null);
  const [editingText, setEditingText] = useState("");

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const appointments: Appointment[] = await getAppointments(CLIENT_ID);

      const map: Record<string, { title: string; data: RowItem[] }> = {};

      for (const appt of appointments) {
        const ymd = appt.fechaStr || (appt.fecha ? String(appt.fecha).slice(0, 10) : "Sin fecha");
        const { key, label } = formatDateForSectionFromYMD(ymd);

        const horaTexto = appt.hora || "Hora no disponible";

        if (!map[key]) map[key] = { title: label, data: [] };

        map[key].data.push({
          id: appt.id,
          horaTexto,
          status: appt.status,
          proposito: appt.proposito ?? null,
          fechaStr: ymd,
        });
      }

      const sortedKeys = Object.keys(map).sort();
      const nextSections = sortedKeys.map((k) => {
        const section = map[k];
        section.data.sort((a, b) => (a.horaTexto || "").localeCompare(b.horaTexto || ""));
        return section;
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSections(nextSections);
    } catch (err: any) {
      console.log("❌ Error citas:", err?.message || err);
      Alert.alert(
        "Error",
        "No se pudieron cargar las citas. Si acabas de reiniciar Render, espera unos segundos y prueba de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, []);

  const changeStatus = async (item: RowItem, newStatus: string) => {
    try {
      await updateAppointment(item.id, { status: newStatus });
      await loadAppointments();
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la cita.");
    }
  };

  const openEditPurpose = (item: RowItem) => {
    setEditingItem(item);
    setEditingText(item.proposito ? String(item.proposito) : "");
    setEditVisible(true);
  };

  const savePurpose = async () => {
    if (!editingItem) return;

    const clean = editingText.trim();
    const finalPurpose = clean.length ? clean.slice(0, 140) : null;

    try {
      await updateAppointment(editingItem.id, { proposito: finalPurpose });
      setEditVisible(false);
      setEditingItem(null);
      setEditingText("");
      await loadAppointments();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el motivo.");
    }
  };

  const showActionsForItem = (item: RowItem) => {
    const options = [
      "Marcar como confirmada",
      "Marcar como pendiente",
      "Cancelar cita",
      "Editar motivo",
      "Cerrar",
    ];
    const cancelButtonIndex = 4;

    const handler = (index: number) => {
      if (index === 0) changeStatus(item, "confirmed");
      if (index === 1) changeStatus(item, "pending");
      if (index === 2) changeStatus(item, "cancelled");
      if (index === 3) openEditPurpose(item);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, title: "Acciones de la cita" },
        (i) => i !== cancelButtonIndex && handler(i)
      );
    } else {
      Alert.alert("Acciones", "Elige una opción", [
        { text: "Confirmada", onPress: () => handler(0) },
        { text: "Pendiente", onPress: () => handler(1) },
        { text: "Cancelar", onPress: () => handler(2), style: "destructive" },
        { text: "Editar motivo", onPress: () => handler(3) },
        { text: "Cerrar", style: "cancel" },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando citas…</Text>
      </View>
    );
  }

  const renderItem = ({ item }: any) => {
    const statusLabel = normalizeStatusLabel(item.status);
    const hasPurpose = item.proposito && String(item.proposito).trim().length > 0;

    return (
      <TouchableOpacity onLongPress={() => showActionsForItem(item)} activeOpacity={0.9}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.clockIcon}>⏰</Text>
            <Text style={styles.hora}>{item.horaTexto}</Text>

            <View style={[styles.chip, getStatusStyle(item.status)]}>
              <Text style={styles.chipText}>{statusLabel}</Text>
            </View>
          </View>

          {hasPurpose ? (
            <Text style={styles.purposeText}>{item.proposito}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const header = ({ section }: any) => (
    <Text style={styles.sectionTitle}>{section.title}</Text>
  );

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={header}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={sections.length === 0 ? styles.center : { paddingBottom: 80 }}
        ListEmptyComponent={<Text>No hay citas registradas.</Text>}
      />

      {/* Modal edición de motivo */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar motivo</Text>
            <Text style={styles.modalSubtitle}>
              Escribe un motivo breve (máx. 140 caracteres).
            </Text>

            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              placeholder="Ej: Consulta sobre MyClarix"
              style={styles.modalInput}
              autoFocus
              maxLength={140}
            />

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => {
                  setEditVisible(false);
                  setEditingItem(null);
                  setEditingText("");
                }}
              >
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={savePurpose}>
                <Text style={styles.modalBtnPrimaryText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ------------------ Estilos ------------------

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
    textTransform: "capitalize",
    color: "#333",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  row: { flexDirection: "row", alignItems: "center" },

  clockIcon: { fontSize: 17, marginRight: 6 },

  hora: { fontSize: 17, fontWeight: "600", color: "#222", flex: 1 },

  purposeText: {
    marginTop: 6,
    marginLeft: 24, // alinea bajo la hora (dejando sitio al icono)
    fontSize: 14,
    color: "#555",
  },

  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },

  chipText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  chipConfirmed: { backgroundColor: "#2ecc71" },
  chipPending: { backgroundColor: "#f1c40f" },
  chipCancelled: { backgroundColor: "#7f8c8d" },
  chipDefault: { backgroundColor: "#3498db" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalSubtitle: { marginTop: 6, fontSize: 13, color: "#555" },
  modalInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  modalBtnGhost: { backgroundColor: "#f3f4f6" },
  modalBtnGhostText: { color: "#111", fontWeight: "700" },
  modalBtnPrimary: { backgroundColor: "#2ecc71" },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "800" },
});


