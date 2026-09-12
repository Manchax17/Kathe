# Registro de cambios — Kathe

Este archivo documenta el **estado inicial** del proyecto y **todos los cambios** que se van
haciendo a lo largo del tiempo. Última actualización: 2026-08-30.

---

## Estado inicial (2026-08-30)

Repositorio clonado desde `github.com/Manchax17/Kathe` (rama `master`, 2 commits:
`201a7dc` FlashCardX v0.1 y `18068ef` rediseño cozy). Stack:

- React 19 + Vite 8
- TailwindCSS 4 (variables CSS para temas)
- Supabase JS v2 (Auth + Postgres)
- pdfjs-dist (extracción de texto de PDF en el navegador)
- Tipografías Fraunces (display) + Inter (UI)

Problemas detectados en la auditoría inicial:

| # | Archivo | Problema | Severidad |
|---|---------|----------|-----------|
| 1 | `src/App.jsx:45` | `react-hooks/set-state-in-effect`: `fetchDecks()` dispara `setState` síncrono dentro de un `useEffect`. Rompe el lint (CI lo frenaría). | Alta |
| 2 | `src/App.jsx` | No había `onAuthStateChange`: la app no reaccionaba a cambios de sesión (token expirado, cierre en otra pestaña). | Media |
| 3 | `src/App.jsx` | Sin estado de carga: al iniciar sesión, pantalla en blanco hasta que `fetchDecks` resolvía. | Media |
| 4 | `src/App.jsx` | `fetchDecks` no manejaba errores de red/RLS. | Media |
| 5 | `src/components/PdfImporter.jsx` | `truncated.originalLength`: `truncated` es boolean, así que el aviso de PDF truncado imprimía `undefined`. | Media |
| 6 | `src/components/StudyMode.jsx` | División por cero: si el mazo está vacío, `firstTryCorrect / totalInitial` daba `NaN`. | Media |
| 7 | `src/components/StudyMode.jsx` | `recordSession` podía ejecutarse dos veces (StrictMode / doble render). | Baja |
| 8 | `src/utils/studyQueue.js` | `localeCompare` sin locale: el orden alfabético en español (tilde, ñ, números) era incorrecto. | Baja |
| 9 | `src/supabaseClient.js` | Sin validación de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`: si faltaban, `createClient` lanzaba un error críptico y la app moría en blanco. | Media |
| 10 | `index.html` | `lang="en"` en una app 100% en español (malo para accesibilidad/SEO). | Baja |
| 11 | `src/components/SettingsModal.jsx` | `handleDeleteAccount` solo borraba mazos, pero el nombre y el texto decían "cuenta". Engañoso. | Baja |
| 12 | `package.json` | `react-router-dom` instalado pero sin usar en ningún lado (~20 KB de bundle muerto). | Baja |

---

## Cambios

### 2026-08-30 — Primera pasada de auditoría y correcciones

- **#1 #2 #3 #4 — `src/App.jsx`**: reemplacé el `useEffect` que llamaba `fetchDecks` (origen del
  error de lint) por un patrón correcto: `supabase.auth.getSession()` inicial + suscripción a
  `onAuthStateChange`. Esto arregla el lint, hace que la app reaccione a cambios de sesión y
  carga los mazos al iniciar. Agregué un estado `loading` (pantalla "Cargando…") y manejo de
  error en `fetchDecks` (muestra el mensaje de Supabase en vez de fallar en silencio).
- **#5 — `src/components/PdfImporter.jsx`**: desestructuro `originalLength` de `extractPdfText`
  y corregí el aviso de truncado para que muestre el número real de caracteres.
- **#6 #7 — `src/components/StudyMode.jsx`**: protegí la división por cero (`totalInitial > 0`)
  y usé una ref (`recordedRef`) para que `recordSession` se ejecute una sola vez al terminar.
- **#8 — `src/utils/studyQueue.js`**: `localeCompare` ahora usa `'es'` con
  `{ sensitivity: 'base', numeric: true }` (ordena tildes, ñ y números correctamente).
- **#9 — `src/supabaseClient.js`**: si faltan las variables de entorno, se imprime un
  `console.error` claro que indica copiar `.env.example` a `.env`.
- **#10 — `index.html`**: `lang="en"` → `lang="es"`.
- **#11 — `src/components/SettingsModal.jsx`**: renombrado `handleDeleteAccount` →
  `handleDeleteDecks` y aclarado el texto de confirmación ("¿Eliminar todos tus mazos?").
- **#12 — `package.json`**: eliminado `react-router-dom` (no se usaba) y desinstalado de
  `node_modules`.

**Verificación**: `npm run lint` sin errores ni warnings; `npm run build` compila
(77 módulos, ~2.4 s). El bundle de la app bajó al quitar `react-router-dom`.

### 2026-08-30 — Pulido de UI

- **`src/components/NewWordModal.jsx` (BUG crítico, Alta)**: el archivo estaba **vacío (0 bytes)**,
  así que el modal para agregar palabras manualmente nunca se renderizaba y la app no permitía
  crear tarjetas a mano. Lo implementé completo (formulario "Nueva palabra" con campo Pregunta +
  Respuesta, validación básica y `autoFocus`) y lo conecté a `FlashCardView`:
  - importé `NewWordModal` y añadí los props `isAddingWord/setIsAddingWord`,
    `newWordKey/setNewWordKey`, `newWordValue/setNewWordValue`, `handleAddWord` al componente.
  - añadí un botón **"Agregar"** en la cabecera junto a "Estudiar".
  - monté `<NewWordModal ... />` al final del árbol (overlay con `anim-fade-in`/`anim-pop`).
  - el handler `handleAddWord` ya existía en `App.jsx` y ahora se dispara desde el modal.
- **`src/index.css` (pulido)**:
  - Transición suave de tema: añadí `transition` de `background-color/color/border-color/box-shadow`
    (~0.3 s) a `body` y a las utilidades de tokens (`bg-*`, `text-*`, `border-rule`, `shadow-*`),
    así el cambio claro↔oscuro no es abrupto.
  - `::selection` con color de tinta (`--accent` sobre `--surface`).
  - `text-wrap: balance` en `.font-display` y `text-wrap: pretty` en párrafos/listas.
  - Las animaciones decorativas (`kathe-fade-in`, `kathe-pop`) ahora viven dentro de
    `@media (prefers-reduced-motion: no-preference)`, respetando la preferencia de accesibilidad
    del sistema (sin animación para quien lo pida).
- **`src/App.jsx` (limpieza)**: eliminé un `useEffect` redundante que llamaba `getSession()`
  duplicando lo que ya hace el efecto principal (sesión + `loading`); quedaba un render de más
  sin beneficio. No cambia el comportamiento.

**Verificación**: `npm run lint` limpio (0 errores, 0 warnings); `npm run build` compila
(78 módulos, ~2.5 s). El `NewWordModal` ya no deja variables sin usar tras quitar el import
de `supabase`.

### 2026-09-02 — Capa social, router y deploy automático

#### Estado previo

La app era **una sola pantalla**: `App.jsx` concentraba 16 `useState` y decidía qué mostrar con
una cascada de `if` (`!user` → `Auth`, `!currentDeck` → `DeckList`, `isStudying` → `StudyMode`,
si no → `FlashcardView`). Consecuencias:

- No había URLs. Recargar la página o compartir un link volvía siempre al inicio.
- `currentDeck` era un **objeto en estado**, así que no existía forma de abrir un mazo por id.
- No había perfiles: `auth.users` no es consultable desde el cliente, y `signUp` no mandaba
  `options.data`, por lo que **ni siquiera existía un username**.
- Los importadores cerraban con `window.location.reload()` para mostrar el mazo nuevo.
- `SettingsModal` hacía `window.location.reload()` tras cerrar sesión.
- `useTheme` no era un Context: `ThemeToggle` y el selector de Ajustes tenían estado
  independiente y se desincronizaban.
- El deploy era **Direct Upload** de un `dist/` compilado en local: sin CI, la web se quedaba
  en la versión anterior si nadie corría el comando de subida.

#### Qué se agregó

**Base de datos** — cuatro migraciones idempotentes en `supabase/migrations/`:

| Migración | Contenido |
|---|---|
| `0002_profiles.sql` | tabla `profiles` (username único con CHECK `^[a-z0-9_]{3,24}$`), RLS, `GRANT` explícito, trigger `handle_new_user` sobre `auth.users` y **backfill** de las cuentas ya existentes |
| `0003_public_decks.sql` | columna `is_public` + política aditiva (en Postgres las políticas permisivas se combinan con OR, así que el dueño sigue viendo todo lo suyo y el resto solo lo público) |
| `0004_chat.sql` | `conversations` + `messages`, UNIQUE sobre la pareja ordenada (`user_low < user_high`, así no puede haber dos hilos entre las mismas personas), RPC `get_or_create_conversation`, trigger de `last_message_at` y publicación de `messages` en Realtime |
| `0005_avatars_storage.sql` | bucket público `avatars` (2 MiB, solo imágenes) con políticas por carpeta |

**Frontend** — de una pantalla a rutas:

- `react-router@8` (se importa desde `react-router`; `react-router-dom` ya no aplica desde v7).
- `App.jsx`: la cascada de `if` pasó a `<Routes>` con `RequireAuth` y `AppShell` como layouts.
- `main.jsx`: `ThemeProvider → AuthProvider → DecksProvider → BrowserRouter`.
- Tres contextos nuevos con sus hooks: `useAuth`, `useDecks`, `useTheme`. `App.jsx` pasó de
  16 `useState` a ninguno.
- `AppShell` unifica las tres cabeceras duplicadas que había (`DeckList`, `FlashCardView`,
  `StudyMode`).
- Páginas nuevas: `LoginPage`, `DecksPage`, `DeckPage`, `StudyPage`, `ExplorePage`,
  `ProfilePage`, `ChatPage`, `SettingsPage` (Ajustes pasó de estado local a ruta `/ajustes`).
- Componentes nuevos: `Avatar`, `AvatarUploader`, `ProfileEditor`, `UserCard`,
  `ConversationList`, `ChatThread`, `MessageBubble`, `Splash`.

**Correcciones de paso** (detectadas en la auditoría previa):

1. **Riesgo alto**: `fetchDecks()` hacía `select('*')` **sin filtrar por `user_id`**. Con la
   política de mazos públicos eso habría devuelto también los mazos de otros. Ahora el
   `DecksProvider` siempre filtra por `user_id`.
2. `signUp` no pasaba `options.data` → no existía username. Se pide en el registro, se
   normaliza en `utils/username.js` y las cuentas viejas se cubren con el backfill.
3. `App.jsx:83` hacía `setUser(data.user)` tras `signUp`: con confirmación por email activada
   dejaba la app logueada sin sesión (pantalla en blanco). Ahora el único dueño de `user` es
   el listener de `onAuthStateChange`, y el registro avisa que hay que confirmar.
4. `window.location.reload()` en `SettingsModal` → `signOut()`; el router manda a `/login`.
5. Los dos importadores ya no recargan la página: escriben por el contexto y la grilla se
   actualiza sola. `PdfImporter` además dejó de re-pedir el usuario en medio del guardado.
6. `useMemo(() => getStats(), [])` congelaba las estadísticas en `DeckList`; ahora hay un
   `useStats()` reactivo sobre `useSyncExternalStore`.
7. `public/_redirects` con `/*  /index.html  200`: sin esto, un deep link a `/u/<usuario>`
   da 404 en Cloudflare.

**Chat en tiempo real**: suscripción a `postgres_changes` filtrada por `conversation_id`, sin
inserción optimista — se inserta con `.select()` y se agrega la fila devuelta, deduplicando
por `id`. Así el mensaje aparece aunque Realtime falle, y nunca se ve dos veces.

#### Nota sobre `react-hooks/set-state-in-effect`

`eslint-plugin-react-hooks@7` **errorea** (no avisa) el `setState` síncrono dentro del cuerpo
de un `useEffect`. Se comprobó con una prueba antes de escribir el código, y por eso:

- los efectos que cargan datos usan un IIFE async (el `setState` ocurre en el `.then`, no en
  el cuerpo del efecto);
- los resets se resolvieron **remontando** con `key` (`<ChatThread key={conversationId} />`,
  `<ProfileEditor key={profile.id} />`) en vez de limpiar estado a mano;
- los resultados se guardan junto al parámetro que los produjo (`{ deckId, deck }`,
  `{ username, profile }`), así un dato viejo deja de coincidir y la página vuelve a cargar
  sin necesidad de ningún efecto de limpieza;
- donde el estado se podía derivar, se deriva: `FlashCardView` recorta el índice con
  `safeIndex` en lugar de sincronizarlo tras borrar la última palabra.

#### Verificación

`npm run lint` limpio (0 errores, 0 warnings) y `npm run build` compila (164 módulos, ~2.4 s).
`dist/_redirects` se copia correctamente.

Pendiente de probar con dos cuentas: buscarse, ver el perfil ajeno, abrir chat y comprobar que
el mensaje aparece en la otra pestaña sin recargar; y que un mazo privado **no** aparezca en el
perfil de otro (esa es la prueba de que RLS quedó bien).

#### Fuera de alcance (para después)

Grupos, seguidores, notificaciones push, "me gusta" en mazos, copiar un mazo ajeno a los
propios, estadísticas de estudio en el servidor (hoy son `localStorage`, o sea por navegador) y
mazos públicos visibles sin iniciar sesión.

---

## 2026-09-11

### Las cuatro migraciones están aplicadas y verificadas

Se corrieron `0002` → `0005` en el SQL Editor, en orden, y después se verificó el estado real
de la base consultándola directamente (no deduciendo desde el código):

- `profiles`, `conversations`, `messages`, `decks`: las cuatro presentes.
- **8 políticas RLS** activas: `profiles` 3, `conversations` 1, `messages` 2, `decks` 2.
- Bucket `avatars` creado; `messages` publicada en `supabase_realtime`.
- `auth.users` sin perfil: **0**. No quedó ninguna cuenta huérfana del backfill.

Se agregaron dos scripts de diagnóstico de solo lectura, que quedan en el repo:

| Script | Cuándo usarlo |
|---|---|
| `supabase/verify_antes.sql` | **Antes** de migrar. Solo consulta catálogos del sistema, así que no puede fallar aunque falten las tablas. |
| `supabase/verify_despues.sql` | **Después** de migrar. Asume que las tablas existen; los bloques 6 y 7 deben dar `0`. |

### Auditoría contra los requisitos del proyecto

Se revisó el código y la base contra la lista de requisitos (RF1–RF8, RNF1–RNF2):

| # | Requisito | Estado |
|---|---|---|
| RF1 | Fichas y mazos, con descripción por mazo | ⚠️ Falta la columna `description` |
| RF2 | Compartir mazos en línea | ✅ `is_public` + RLS + toggle + Explorar |
| RF3 | Perfil, publicaciones y fotos | ⚠️ Perfil ✅ · avatares ✅ · **publicaciones ❌** |
| RF4 | Mensajes directos y grupos | ⚠️ DM 1:1 ✅ · **grupos ❌** |
| RF5 | Personalizar el diseño (CSS/Tailwind) | ⚠️ claro/oscuro ✅ · **por usuario ❌** |
| RF6 | Integración con IA mediante API key | ⚠️ Gemini del lado del servidor ✅ · **UI para clave propia ❌** |
| RF7 | Multi-proveedor (Claude, Qwen, ChatGPT, Gemini, Hunyuan, NIM, OpenRouter, DeepSeek) | ❌ Solo Gemini |
| RF8 | Conexión directa con ANKI | ❌ Solo exporta `.txt` |
| RNF1 | Escritorio y móvil, estilo FB/Instagram | ⚠️ Responsive ✅ · **feed social ❌** |
| RNF2 | Traducción generada por IA | ❌ |

### Arquitectura de datos elegida

Se descartó sumar MongoDB: con el volumen actual no se justifica otra base que mantener.

- **Postgres relacional** para todo lo que tiene relaciones y se consulta por filas:
  `auth.users`, `profiles`, `decks`, `cards`, `conversations`, `messages`, `study_stats`
  (y `groups` cuando exista).
- **JSONB** (NoSQL dentro de Postgres) para lo que es de forma libre y se lee entero:
  `posts.body`, `ai_providers.config`, `user_themes`, `translations`,
  `anki_export_payloads`. Así se tiene la flexibilidad de un documento sin perder
  transacciones ni RLS.
- **Storage** para binarios: `avatars/`, `posts/`, `anki_media/`, `imports_tmp/`.
- MongoDB externo solo tendría sentido si las publicaciones llegaran a millones. Hoy no.

### Herramientas

Se configuró el MCP de Supabase (`~/.workbuddy-ai/mcp.json`) apuntando al proyecto de Kathe
con `project_ref=ndwwkveajuviwkndulxk`. Esto permite inspeccionar y migrar la base sin el
ciclo de copiar y pegar SQL a mano; fue lo que permitió confirmar que las migraciones
quedaron bien aplicadas.

### Corrección

En una sesión anterior se diagnosticó un supuesto bug de "usuarios duplicados"
(`manchax2005` vs `manchax2005_1`) y se escribieron tres scripts para corregirlo. **El bug
nunca existió**: se había leído mal una captura de pantalla. La consulta
`group by username having count(*) > 1` devuelve `[]`, y las restricciones
`profiles_username_key` (UNIQUE) y `profiles_username_format` (CHECK `^[a-z0-9_]{3,24}$`)
estuvieron siempre presentes. Los tres scripts se eliminaron; nunca se commitearon.

### Deploy automático y bug de "me saca al registro"

**Cloudflare Pages conectado a GitHub.** El proyecto estaba creado por *Direct Upload* y
seguía una rama `main` que ya no existe en el remoto (el repo quedó solo con `master`), así
que el último deploy válido era de hacía 12 días. Se reconectó apuntando a `master`, con
framework *React (Vite)*, build `npm run build`, salida `dist`, y las variables
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `NODE_VERSION=22`.

> **Cuidado**: en Cloudflare Pages las variables de entorno **no** se aplican a un deploy ya
> construido. Después de cargarlas hay que rebuildear (Retry deployment) o el bundle sale
> sin credenciales y la app queda en pantalla negra.

**Corrección: sesión perdida al entrar.** Ya desplegado, la app dejaba entrar y a los
segundos devolvía al login. La única vía de expulsión es `RequireAuth` viendo `user === null`,
así que la causa estaba en `AuthProvider`:

- `loading` se apagaba cuando resolvía `getSession()`, que va **antes** de que Supabase
  termine de leer el storage. Quedaba una ventana con `loading=false` y `user=null`, y
  `RequireAuth` mandaba a `/login`.
- Ahora `loading` se apaga recién con el **primer evento** de `onAuthStateChange`, que es
  cuando la sesión está realmente resuelta. `getSession()` queda como red de seguridad.
- Además, un `INITIAL_SESSION` sin sesión ya no desloguea a quien estaba adentro: la única
  forma legítima de perder la sesión es un `SIGNED_OUT` explícito (incluido el que emite
  Supabase si falla el refresh del token).
