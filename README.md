# Kathe · Tu cuaderno de palabras

Kathe es una app de flashcards con estética *cozy study*: papel cálido, tipografía serif, y cero
distracciones. Pensada para repaso espaciado en sesiones cortas, con un modo claro y un modo
oscuro que respetan tu vista.

Inspirada en Anki, pero más visual y con un entorno cuidado.

> **Repositorio:** [github.com/Manchax17/Kathe](https://github.com/Manchax17/Kathe)
> **App publicada:** [kathe-avl.pages.dev](https://kathe-avl.pages.dev)

## Características

- **Mazos y palabras** guardados en Supabase (Postgres + Auth).
- **Agregar palabras a mano** desde el botón "Agregar" en cada mazo (pregunta + respuesta),
  además de importar o generar con IA.
- **Importar** desde archivos `.txt` estilo Anki (pregunta ⇥ respuesta por línea) o pegar directo.
- **Modo estudio** con cola inteligente: si fallás, la palabra vuelve más tarde; si acertás, sale.
  Atajos: `Espacio` para revelar, `1` incorrecto, `2` correcto.
- **Modos de orden** por mazo: inserción, alfabético, inverso, aleatorio de sesión, aleatorio con
  semilla diaria.
- **Descargar** cualquier mazo como `.txt` (compatible con Anki).
- **Modo oscuro / claro** con detección automática del sistema.
- **Personalizá el diseño** (Ajustes → Apariencia): color de acento (7 presets), tamaño del
  texto, esquinas redondeadas o cuadradas, y textura de papel. Se guarda en tu perfil, así que
  te sigue en cualquier dispositivo.
- **IA: PDF → flashcards** — subí un PDF y Gemini extrae los conceptos clave
  como tarjetas editables antes de guardarlas en un mazo.
- **Estadísticas locales**: racha de días, dominio a la primera, puntos por sesión.
- **Renombrar** y **eliminar** mazos desde el menú ⋯ de cada card.

### Capa social

- **Perfil público** en `/u/<usuario>` con avatar, nombre y biografía.
- **Mazos públicos**: marcalos desde el menú ⋯ y aparecen en tu perfil. Los privados siguen
  siendo solo tuyos (lo garantiza RLS, no el frontend).
- **Explorar** personas por `@usuario` o nombre, con la cantidad de mazos públicos de cada una.
- **Chat 1:1 en tiempo real** (Realtime de Supabase), con historial de solo-apendizaje: nadie
  puede editar ni borrar un mensaje ya enviado.

## Stack

- React 19 + Vite 8
- TailwindCSS 4 (con variables CSS para temas)
- Supabase JS v2 (Auth + Postgres + Realtime + Storage)
- React Router v8 (rutas del lado del cliente)
- Tipografías: Fraunces (display) + Inter (UI)

## Cómo correrlo

```bash
npm install
cp .env.example .env   # rellenar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Abrí `http://localhost:5173`.

### Setup de Supabase

En el SQL Editor del dashboard, corré estas migraciones en orden:

1. `supabase/migrations/0001_create_decks.sql` — crea la tabla `decks` con RLS.
2. `supabase/migrations/20260108000000_add_study_order_to_decks.sql` — agrega la columna
   `study_order` para los modos de orden.
3. `supabase/migrations/0002_profiles.sql` — tabla `profiles`, trigger que crea el perfil
   al registrarse, y backfill de las cuentas ya existentes.
4. `supabase/migrations/0003_public_decks.sql` — columna `is_public` y la política que
   deja ver los mazos públicos.
5. `supabase/migrations/0004_chat.sql` — `conversations` + `messages`, la RPC
   `get_or_create_conversation` y la publicación de `messages` en Realtime.
6. `supabase/migrations/0005_avatars_storage.sql` — bucket público `avatars` (2 MiB).
7. `supabase/migrations/0006_user_theme.sql` — columna `appearance` en `profiles`, donde cada
   usuario guarda su personalización de diseño.

Son **idempotentes**: se pueden correr más de una vez sin romper nada.

Activá **Email auth** en `Authentication → Providers`.

> Si el proveedor tiene la confirmación por email activada, el registro avisa que hay que
> confirmar la cuenta antes de entrar, en vez de dejar la app en blanco.

### IA (PDF → flashcards)

Usa una Supabase Edge Function + Google Gemini. Setup:

```bash
# 1. API key gratis en https://aistudio.google.com/apikey
supabase secrets set GEMINI_API_KEY=tu_key

# 2. Deployar la función
supabase functions deploy extract-cards
```

La extracción de texto del PDF ocurre en el navegador (`pdfjs-dist`); solo el
texto viaja a Gemini, nunca el archivo. Solo PDFs con texto seleccionable
(los escaneados quedan para una v2 con OCR).

## Deploy

La app es un **SPA estático**: `npm run build` genera `dist/`.

Usa **rutas del lado del cliente** (React Router), así que el host tiene que devolver
`index.html` para cualquier ruta desconocida. Si no, un link directo a `/u/manchax` o
`/chat/<id>` responde 404 aunque la página exista.

Eso ya está resuelto con `public/_redirects`, que Vite copia a `dist/`:

```
/*    /index.html   200
```

Netlify lo respeta sin configuración. En Cloudflare Pages y Vercel también funciona; si en
algún host no llegara, la regla equivalente es "rewrite todo a `/index.html` con status 200".

### Variables de entorno (obligatorias)

Vite **hornea** las variables en el bundle en tiempo de compilación. Hay que configurarlas en
la plataforma **antes** del build (no sirve definirlas solo en runtime):

| Variable | Dónde obtenerla |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → clave `anon` `public` |

> La `anon key` está pensada para vivir en el navegador: es pública por diseño. Lo que protege
> tus datos son las políticas **RLS** de la tabla `decks` (ya incluidas en la migración).
> Nunca pongas la `service_role` key en el frontend.

### Vercel (recomendado)

1. Importá el repo `Manchax17/Kathe` en [vercel.com/new](https://vercel.com/new).
2. Framework Preset: **Vite** (lo detecta solo). Build: `npm run build`, output: `dist`.
3. En **Environment Variables** agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Cada push a `master` redespliega automáticamente.

### Cloudflare Pages (donde está publicada hoy)

**URL de producción:** https://kathe-avl.pages.dev

Se publicó con **Direct Upload**: el build se hace en local (con las variables ya horneadas) y
se sube `dist/`, así que Cloudflare no necesita compilar nada.

```bash
npx wrangler pages deploy dist --project-name kathe --branch main
```

Requiere `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como variables de entorno.

Si en cambio conectás el repo para que **Cloudflare construya** (auto-deploy en cada push),
agregá también `NODE_VERSION=22`: el build v3 de Cloudflare **ignora el campo `engines`** del
`package.json`, así que esa es la única forma de fijar la versión de Node ahí.

### Netlify

Mismo esquema que Vercel: build `npm run build`, directorio `dist`, y las dos variables.

### Deploy automático desde GitHub

Con Direct Upload hay que acordarse de subir `dist/` a mano; si no, la web se queda en la
versión anterior por más que el código cambie. Conectando el repo, cada push a `master`
reconstruye y publica solo:

1. En el dashboard de Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
2. Autorizá la app de Cloudflare en tu cuenta de GitHub y elegí `Manchax17/Kathe`.
3. Build command `npm run build` · output directory `dist` · rama `master`.
4. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `NODE_VERSION=22`.

> El `installation id` de la GitHub App solo se obtiene por OAuth, así que este paso no se
> puede hacer desde la API: es sí o sí desde el panel.

### La función de IA se despliega aparte

El PDF → flashcards corre como **Supabase Edge Function**, no en el host del frontend:

```bash
supabase secrets set GEMINI_API_KEY=tu_key
supabase functions deploy extract-cards
```

## Estructura

```
src/
  pages/         LoginPage, DecksPage, DeckPage, StudyPage,
                 ExplorePage, ProfilePage, ChatPage, SettingsPage
  components/    AppShell, Auth, DeckList, DeckCard, FlashCardView, StudyMode,
                 FileImporter, PdfImporter, CardsReviewModal, NewWordModal,
                 SettingsModal, ProfileEditor, AppearanceEditor, AvatarUploader,
                 Avatar, ConversationList, ChatThread, MessageBubble, UserCard,
                 Logo, ThemeToggle, Splash
  context/       ThemeProvider, AuthProvider, DecksProvider (+ sus contextos)
  hooks/         useTheme, useAuth, useDecks, useStats, useRouteDeck
  utils/         studyQueue, deckIO, stats, pdfText, aiClient, username, appearance
  supabaseClient.js
public/
  _redirects     fallback del SPA (/* -> /index.html 200)
supabase/
  migrations/    0001 decks · study_order · 0002 profiles · 0003 public_decks
                 0004 chat · 0005 avatars_storage · 0006 user_theme
  functions/     extract-cards (Edge Function con Gemini)
```

### Rutas

| Ruta | Vista |
|---|---|
| `/login` | Alta e inicio de sesión |
| `/` | Mis mazos + importadores |
| `/deck/:deckId` | Fichas del mazo |
| `/deck/:deckId/study` | Sesión de estudio |
| `/explorar` | Buscar personas |
| `/u/:username` | Perfil público |
| `/chat` · `/chat/:conversationId` | Mensajes |
| `/ajustes` | Perfil, apariencia, tema, cuenta, estadísticas |

Diseñado por **Manchax**.

## Registro de cambios

Los ajustes y el estado inicial del proyecto se documentan en
[`changes.md`](./changes.md). Se actualiza con cada modificación.

### Estado actual (2026-09-02)

**Capa social + router.** La app dejó de ser una sola pantalla con estado centralizado en
`App.jsx`: ahora hay rutas URLs, perfiles públicos, mazos compartibles, Explorar y chat 1:1
en tiempo real.

Para eso se agregó **React Router v8** y `public/_redirects` (el fallback del SPA). La frase
"no usa rutas del lado del cliente" que decía este README ya no es cierta, y la dependencia
`react-router-dom` que se había eliminado por no usarse volvió a entrar como `react-router`,
que es el paquete correcto desde v7.

La sesión, los mazos y el tema viven en contextos (`AuthProvider`, `DecksProvider`,
`ThemeProvider`), así que `App.jsx` pasó de 16 `useState` a un único árbol de rutas.

Detalle de todo lo anterior en [`changes.md`](./changes.md).
