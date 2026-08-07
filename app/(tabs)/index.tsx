// app/(tabs)/index.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { sendChatMessage } from "../../utils/services/services";
import { ChatMessage, Mode } from "../../utils/types";

const CLIENT_ID = "mobile_client_1";
const DEFAULT_MODE: Mode = "normal";

/**
 * 🔐 Generador de IDs únicos y estables para FlatList
 */
function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ✅ Lista de modos (unificados con backend)
 * IMPORTANTE: "normal" es el modo por defecto (backend).
 */
const MODES: { id: Mode; label: string }[] = [
  { id: "normal", label: "Modo general" },
  { id: "organizacion", label: "Organización" },
  { id: "ventas", label: "Ventas" },
  { id: "contenidos", label: "Contenidos" },
  { id: "ciberdemia", label: "Ciberdemia" },
];

export default function IndexScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uniqueId("welcome"),
      text: "Hola, soy MyClarix. ¿En qué te ayudo hoy?",
      sender: "assistant",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<FlatList>(null);

  // ✅ Auto-scroll al final al recibir mensajes
  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    setInputText("");
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: uniqueId("user"),
      text: textToSend,
      sender: "user",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // ✅ ORDEN CORRECTO: (clientId, message, mode)
      const replyRaw = await sendChatMessage(CLIENT_ID, textToSend, mode);

      const replyText =
        String(
          replyRaw?.reply ??
            replyRaw?.message ??
            replyRaw?.content ??
            replyRaw?.text ??
            ""
        ).trim() || "Ok.";

      const assistantMessage: ChatMessage = {
        id: uniqueId("assistant"),
        text: replyText,
        sender: "assistant",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      console.log("❌ Error enviando mensaje", e);

      setMessages((prev) => [
        ...prev,
        {
          id: uniqueId("error"),
          text: "Error al enviar el mensaje.",
          sender: "assistant",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  const ModeButton = ({ id, label }: { id: Mode; label: string }) => (
    <TouchableOpacity
      style={[styles.modeButton, mode === id && styles.modeButtonActive]}
      onPress={() => setMode(id)}
    >
      <Text
        style={[styles.modeButtonText, mode === id && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Barra de modos */}
      <View style={styles.modesContainer}>
        {MODES.map((m) => (
          <ModeButton key={m.id} id={m.id} label={m.label} />
        ))}
      </View>

      {/* Lista de mensajes */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input + botón Enviar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor="#6b7280"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, isSending ? { opacity: 0.6 } : null]}
          onPress={handleSend}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>{isSending ? "..." : "Enviar"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },

  modesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    backgroundColor: "#020617",
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  modeButtonActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  modeButtonText: { color: "#9ca3af", fontSize: 12 },
  modeButtonTextActive: { color: "#020617", fontWeight: "600" },

  chatContainer: { padding: 16, paddingBottom: 80 },

  messageContainer: {
    maxWidth: "80%",
    marginVertical: 6,
    padding: 10,
    borderRadius: 12,
  },
  messageLeft: { alignSelf: "flex-start", backgroundColor: "#1f2937" },
  messageRight: { alignSelf: "flex-end", backgroundColor: "#3b82f6" },
  messageText: { color: "white", fontSize: 14 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    backgroundColor: "#020617",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#020617",
    color: "white",
    borderRadius: 10,
    marginRight: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#111827",
  },
  sendButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#22c55e",
  },
  sendButtonText: { color: "#020617", fontWeight: "bold" },
});
