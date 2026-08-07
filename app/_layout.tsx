import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Grupo de pestañas (Home, Explore, chat, appointments, etc.) */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      {/* Pantalla modal (si la usas) */}
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          title: "Modal",
        }}
      />
    </Stack>
  );
}
