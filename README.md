# Lumina Mobile

App móvil de **MyClarix** (asistente con IA de Open Consultech) hecha con Expo y React Native. Permite conversar con el asistente en distintos modos de trabajo y gestionar citas desde el teléfono. Funciona en iOS, Android y web.

## Qué hace

- **Chat con el asistente de IA**, con historial de la conversación guardado en el backend.
- **Modos de conversación**: general, organización, ventas, contenidos y Ciberdemia; el modo elegido se envía con cada mensaje para que el asistente responda según el contexto.
- **Citas**: lista, creación, cambio de estado (por ejemplo, cancelar) y edición del motivo, con estados en español e inglés.
- **Identificación anónima del dispositivo**: se genera un identificador aleatorio y se guarda en el almacenamiento local, sin pedir cuenta ni datos personales.
- **Tema claro y oscuro** automático y retroalimentación háptica en la navegación.

## Tecnologías

- Expo SDK 54, React Native 0.81 y React 19 (nueva arquitectura activada)
- TypeScript
- Expo Router (navegación por archivos con pestañas)
- AsyncStorage para el identificador local
- `chrono-node` para interpretar fechas escritas en lenguaje natural
- Backend propio de MyClarix consumido por API REST

## Cómo ejecutarlo

Requisitos: Node 20+ y, para probarlo en el móvil, la app Expo Go o un emulador.

```bash
npm install
npx expo start      # pulsa a (Android), i (iOS) o w (web)
```

La URL del backend está definida en `utils/config.ts`, así que no hace falta ningún `.env`.

## Estructura

```
app/(tabs)/      pantallas: inicio (chat), chat, citas y explorar
app/_layout.tsx  navegación raíz
utils/           cliente de la API (chat y citas, con timeout de 12 s), tipos, modos e id de cliente
components/      componentes de interfaz reutilizables
constants/       tema (colores)
hooks/           hooks de tema y esquema de color
```

## Decisiones de diseño

- **Cliente HTTP con timeout:** las peticiones a la API se cancelan a los 12 segundos para que la app no se quede bloqueada si el servidor tarda en despertar.
- **Tipos separados para backend y UI:** el mensaje del servidor se convierte al formato de la interfaz en un único punto (`backendToUiMessage`), con una clave única por mensaje.
- **Sin cuentas en esta versión:** la app identifica al dispositivo con un id local, lo que evita guardar datos personales en el móvil.

## Pendiente

- Dejar la URL del API en un solo sitio (ahora está repetida en tres archivos) y leerla de una variable de entorno de Expo.
- Quitar del proyecto el código sobrante de la plantilla de Expo (pantalla de ejemplo y componentes sin uso).
- Capturas de pantalla y despliegue de pruebas con EAS.

## Autoría

Miguelina Rosario · [Open Consultech](https://www.openconsultech.net)
