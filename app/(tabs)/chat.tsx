// app/(tabs)/chat.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getChatHistory, sendChatMessage } from "../../utils/services/services";
import { ChatMessage, Mode, backendToUiMessage } from "../../utils/types";

const CLIENT_ID = "mobile_client_1";
const DEFAULT_MODE: Mode = "normal";

/**
 * 🔐 Generador de IDs únicos y estables para FlatList
 */
function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Detecta el “saludo largo” típico del backend
 */
function isBackendGreeting(text: string) {
  const lower = (text || "").toLowerCase();
  return (
    lower.includes("me alegra conocerte") ||
    lower.includes("¿en qué puedo ayudarte") ||
    lower.includes("estoy aquí para ayudarte") ||
    lower.includes("hablemos")
  );
}

const WELCOME_MESSAGE: ChatMessage = {
  id: uniqueId("welcome"),
  text: "Hola, soy MyClarix. ¿En qué te ayudo hoy?",
  sender: "assistant",
  createdAt: new Date().toISOString(),
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [mode] = useState<Mode>(DEFAULT_MODE);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);

  // 🧠 Cargar historial (una sola vez)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const historyRaw = await getChatHistory(CLIENT_ID);

        const historyUi = (historyRaw ?? [])
          .filter((m) => (m?.content ?? "").trim().length > 0)
          .map((m) => {
            const ui = backendToUiMessage(m as any);
            // ✅ BLINDAJE TOTAL: el historial también recibe IDs únicos
            return { ...ui, id: uniqueId("h") };
          })
          .filter((m) => !isBackendGreeting(m.text));

        if (!mounted) return;

        if (historyUi.length > 0) {
          setMessages([WELCOME_MESSAGE, ...historyUi]);
        } else {
          setMessages([WELCOME_MESSAGE]);
        }
      } catch (e) {
        console.log("❌ Error cargando historial", e);
        if (mounted) setMessages([WELCOME_MESSAGE]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔽 Auto-scroll seguro
  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText("");

    const userMsg: ChatMessage = {
      id: uniqueId("user"),
      text,
      sender: "user",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const replyRaw = await sendChatMessage(CLIENT_ID, text, mode);

      const replyText =
        String(
          replyRaw?.reply ??
            replyRaw?.message ??
            replyRaw?.content ??
            replyRaw?.text ??
            ""
        ).trim() || "Ok.";

      const shouldSkipGreeting =
        isBackendGreeting(replyText) && messages.length > 1;

      if (!shouldSkipGreeting) {
        const replyUi: ChatMessage = {
          id: uniqueId("assistant"),
          text: replyText,
          sender: "assistant",
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, replyUi]);
      }
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
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.sender === "user" ? styles.user : styles.assistant,
      ]}
    >
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ color: "#9ca3af" }}>Cargando…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje…"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          style={[styles.send, sending ? { opacity: 0.6 } : null]}
        >
          <Text style={styles.sendText}>{sending ? "…" : "Enviar"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  bubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 14,
    marginVertical: 4,
  },
  user: { alignSelf: "flex-end", backgroundColor: "#4b6fff" },
  assistant: { alignSelf: "flex-start", backgroundColor: "#1f2933" },
  text: { color: "#fff", fontSize: 14 },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f2933",
  },
  input: {
    flex: 1,
    backgroundColor: "#0b1120",
    color: "#fff",
    borderRadius: 10,
    padding: 8,
  },
  send: {
    marginLeft: 8,
    backgroundColor: "#4b6fff",
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 10,
  },
  sendText: { color: "#fff", fontWeight: "600" },
});
