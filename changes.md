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
| RF1 | Fichas y mazos, con descripción por mazo | ✅ `description` (migración 0007), alta, edición y búsqueda |
| RF2 | Compartir mazos en línea | ✅ `is_public` + RLS + toggle + Explorar |
| RF3 | Perfil, publicaciones y fotos | ⚠️ Perfil ✅ · avatares ✅ · **publicaciones ❌** |
| RF4 | Mensajes directos y grupos | ⚠️ DM 1:1 ✅ · **grupos ❌** |
| RF5 | Personalizar el diseño (CSS/Tailwind) | ✅ 8 temas base × cualquier acento, color libre y CSS propio |
| RF6 | Integración con IA mediante API key | ✅ key propia por usuario + rate limit en la del servidor |
| RF7 | Multi-proveedor (Claude, Qwen, ChatGPT, Gemini, Hunyuan, NIM, OpenRouter, DeepSeek) | ⚠️ adaptadores `gemini` + `openai_compatible` (cubre casi toda la lista) · falta Anthropic nativo |
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

### Personalización de apariencia (RF5)

Hasta acá el único ajuste visual era claro/oscuro, que es global. Ahora cada usuario puede
personalizar la app y **esa elección viaja entre dispositivos**, porque se guarda en su
perfil y no solo en el navegador.

**Migración `0006_user_theme.sql`** (aplicada): columna `profiles.appearance` de tipo `jsonb`
con default `'{}'`. Se eligió JSONB y no una columna por ajuste para poder sumar opciones sin
otra migración; y se llama `appearance` y no `theme` porque "theme" ya significa claro/oscuro
en el resto del código.

Qué se puede cambiar, desde **Ajustes → Apariencia**:

| Ajuste | Opciones |
|---|---|
| Color de acento | 7 presets: terracota, bosque, océano, lavanda, mostaza, frambuesa, grafito |
| Tamaño del texto | Compacta / Normal / Grande |
| Esquinas | Redondeado / Cuadrado |
| Textura de papel | Activada / Desactivada |

**Cómo está implementado.** Todo se resuelve sobrescribiendo variables CSS en `<html>` desde
el `ThemeProvider`; no hay que tocar Tailwind ni recompilar. Se comprobó en el CSS compilado
que las utilidades ya leen variables:

- `.rounded-3xl { border-radius: var(--radius-3xl) }` → reescribiendo los `--radius-*`
  responde el control de esquinas.
- `.text-accent { color: var(--accent) }` → reescribiendo `--accent` y compañía responde el
  color.

El tamaño del texto va como `--kathe-font-scale` sobre `html { font-size: calc(100% * …) }`.
Al estar en `%` sobre la raíz, escala texto **y** espaciados de forma pareja (todo está en
`rem`).

**Por qué presets y no un selector de color libre.** Cada preset trae su variante clara y
oscura ya ajustada a mano. Calcular "un poco más claro" y "un poco más oscuro" a partir de un
hex suele dar texto ilegible en uno de los dos modos; los presets garantizan contraste.

**Detalle de implementación**: el `ThemeProvider` pasó a vivir **dentro** del `AuthProvider`
(antes estaba afuera) porque la apariencia se lee del perfil. La apariencia se **deriva** de
`draft ?? profile.appearance` en vez de sincronizarse con un efecto: el cambio se ve al
instante y no hay `setState` dentro de un `useEffect`.

### Color libre y CSS propio

Los presets quedaron como atajo, pero ya no son el techo: ahora se puede elegir **cualquier
color** (rueda de color o hex escrito) y sumar **CSS propio**.

**El color no se elige: se genera la paleta.** El usuario elige un color y de ahí se derivan
los cuatro que usa la app (`accent`, `soft`, `ink`, `surface`). Elegir uno solo no alcanza:
con el mismo hex no se puede tener a la vez un botón y un texto legibles sobre su chip.

Tres cosas que salieron de probar la generación con colores reales y que hubo que corregir:

1. **El texto del chip se empujaba siempre en la misma dirección.** Sobre fondo claro el texto
   tiene que ir hacia oscuro y sobre oscuro hacia claro; el primer intento lo movía siempre
   para el mismo lado, así que un acento amarillo terminaba con texto blanco sobre chip claro,
   ilegible. Ahora la dirección se elige midiendo el fondo.
2. **`surface` es semi-transparente**, así que medir su contraste contra el color "de papel"
   daba un número sin sentido (y `NaN`, porque el parser no entendía `rgba()`). Ahora se
   compone el color efectivo sobre el fondo y se mide contra eso.
3. **Los `rgba()` salían con decimales** (`rgba(173.92, 109.39, …)`). Válido en CSS pero sucio;
   se redondean.

Verificado con 9 colores (incluidos `#ffeb3b`, `#ffffff` y `#000000` como casos límite): en
los dos modos el texto del chip queda siempre por encima de 4.5:1, el mínimo de WCAG AA.

**Aviso de contraste, no bloqueo.** Si el acento elegido no llega a 3:1 contra el fondo, se
avisa con el ratio exacto pero **se permite igual**. Es la apariencia del usuario; bloquear
sería peor que avisar.

**CSS propio.** Se aplica dentro de `@layer kathe-custom { :root { … } }`, que lo deja con
menor prioridad que el diseño base: sirve para agregar o ajustar cosas, no para romper lo que
ya funciona. La sanitización quita `<style>`, `@import` y **cualquier `url(...)`** — no solo
los remotos, porque un `url()` en CSS propio permite filtrar datos por la IP del visitante o
rastrearlo. Está pensada para que un error de tipeo no rompa el layout, no como defensa contra
un atacante: en una app de un solo autor, cada quien estiliza su propia sesión y nada más.

### Temas base estándar

La personalización tenía acentos pero un solo esqueleto visual. Ahora hay **ocho temas base**
combinables con **cualquier acento**, más el acento libre y el CSS propio.

| Tema | Carácter | `attr` |
|---|---|---|
| Papel | El cuaderno cálido de siempre | *(ninguno)* |
| Glass | Vidrio esmerilado con manchas de color detrás | `glass` |
| Cappuccino | Espresso y crema | `cappuccino` |
| Tokyo Night | Azules y violetas nocturnos | `tokyo-night` |
| Nord | Azules polares, grises fríos | `nord` |
| Dracula | Oscuro violáceo con acentos eléctricos | `dracula` |
| Gruvbox | Retro cálido, ámbar sobre grises terrosos | `gruvbox` |
| Solarized | Tonos equilibrados del clásico | `solarized` |

**Separación de responsabilidades.** Un **tema** define *estructura* (fondo, superficies,
tinta, bordes, sombras, tipografía); la **apariencia** elige *acento, escala, esquinas y
textura*. Son ortogonales a propósito: así ocho temas por siete acentos no son 56 presets, son
dos listas independientes. El tema base se aplica con un atributo (`data-theme-base`) cuyo CSS
vive en `index.css`; el acento se aplica con variables CSS desde el provider.

**Tokens nuevos que necesitó el vidrio.** Los temas de papel podían ignorar el `backdrop-filter`
porque sus superficies son opacas. El vidrio no: sin algo detrás que desenfocar, un
`rgba(255,255,255,0.07)` no se lee como vidrio sino como una caja gris. Por eso se agregaron:

- `--kathe-app-bg` — capa fija con manchas de gradiente radial, detrás de todo (`body::after`).
- `--kathe-surface-filter` / `--kathe-app-filter` — el desenfoque, aplicado en las utilidades
  de superficie.
- `--kathe-grain-mode` — la textura de papel se multiplica en claro y se aclara (`screen`) en
  oscuro; el vidrio invierte esa lógica.
- `--kathe-tracking`, `--kathe-display-weight` — el vidrio pide letras más juntas y más peso
  para compensar el fondo translúcido.

**El texto de los botones dejó de ser `--surface`.** Era crema en toda la app porque el acento
de fábrica es terracota oscuro. Con un acento claro —el violeta de Glass, el ámbar de Gruvbox—
la crema sobre el botón queda ilegible. Ahora hay `--on-accent`, calculado **midiendo** el
contraste contra el acento resuelto y eligiendo blanco o tinta oscura. Se aplicó a los ~20
puntos donde había texto sobre relleno de acento (botones primarios, burbujas propias, el logo,
la selección de texto).

**Los temas también necesitan acentos distintos según el modo.** El violeta de Dracula
(`#bd93f9`) se lee perfecto sobre su fondo oscuro y **no se lee** sobre su fondo claro
(2.2:1). Por eso `THEME_ACCENT_DEFAULTS` trae un valor por modo: al elegir un tema se aplica
su acento característico, y si el usuario después elige otro, manda su elección. La muestra
del selector de acento también usa el tono del modo actual, para no mostrar un color que no es
el que se va a aplicar.

**Verificación (`npm run check:themes`).** Los temas son mucho CSS sin lógica, y un color mal
elegido no rompe nada: simplemente deja texto que no se lee. El script recorre los 8 temas ×
2 modos × 16 acentos y falla si:

- el texto sobre un relleno de acento baja de 3:1 (interfaz) — avisa si baja de 4.5:1 (lectura);
- el acento por defecto de un tema baja de 3:1 contra el fondo de ese tema;
- la tinta de un tema baja de 4.5:1 contra su propio fondo;
- dos temas comparten fondo, o un fondo "claro" no es claro.

Encontró dos cosas reales que estaban mal: el violeta de Glass no se leía sobre el fondo claro
de Glass (2.93:1), y **Cappuccino en oscuro era idéntico a Papel en oscuro** — el bloque
`[data-theme-base='cappuccino']` no tenía variante oscura, así que elegir Cappuccino de noche no
cambiaba nada. Se corrigieron ambos.

**Dos trampas del CSS compilado** que aparecieron al revisar el bundle y no en el código fuente:

1. `[class*='tracking-']` **no matchea las utilidades con corchetes** (`tracking-[0.2em]`). La
   clase real en el DOM es `tracking-[0.2em]`, y el `\` del selector compilado es una barra
   literal que ahí no matchea nada. Se enumeran las dos formas por separado, y `tracking-tight`
   queda afuera a propósito: ahí el apretado es la intención, no el tema.
2. Los valores `rgba(255,255,255,0.07)` se minifican a hex de 8 dígitos (`#ffffff12`). Es
   equivalente, pero confunde al inspeccionar el bundle.

---

### Descripción de mazo (RF1)

El requisito pide "crear cards y decks con descripción por deck". Crear decks y fichas ya
funcionaba; lo único que faltaba era el campo de descripción. Se cerró en las tres capas.

**Base de datos** — migración `0007_deck_description`:

```sql
alter table public.decks
  add column if not exists description text not null default '';

alter table public.decks
  drop constraint if exists decks_description_length;
alter table public.decks
  add constraint decks_description_length check (char_length(description) <= 280);
```

El `default ''` es a propósito: los mazos que ya existen quedan con cadena vacía y no con
`null`, así el front no tiene que defenderse de dos casos ("sin descripción" y "descripción
nula") que significan lo mismo. El tope de 280 no es capricho: la descripción se muestra
recortada a **dos líneas** en la tarjeta, y la tarjeta tiene alto fijo — un texto sin límite
desbordaría el botón de abajo.

Verificado contra la base real, no solo leyendo el SQL: la columna existe con
`text not null default ''`, la constraint figura como `CHECK ((char_length(description) <= 280))`,
y un bloque de prueba confirmó que 280 caracteres entran, 281 se rechazan con `check_violation`,
y el valor por defecto es la cadena vacía. Después se borraron las filas de prueba.

**Proveedor** (`DecksProvider.jsx`) — dos cambios:

- `createDeck(name, words, isPublic, description = '')`.
- Nuevo `setDescription(deckId, description)`, calcado de `renameDeck`.

La creación conserva el fallback en cascada por código `42703` (`undefined_column`): si la
migración 0007 todavía no está aplicada en algún entorno, el insert reintenta sin `description`
en vez de romper. Como el proyecto se despliega a un Supabase remoto, el mismo código tiene que
funcionar antes y después de aplicar la migración.

`setDescription` **no** revienta si falta la columna: avisa por consola y devuelve el error,
porque una descripción que no se guarda no justifica tirar abajo la pantalla de mazos.

**Interfaz** — el campo se puede escribir en dos lugares y se lee en uno:

- Alta de mazo (`DeckList.jsx`): un `<textarea rows={2} maxLength={280}>` debajo del nombre.
  Enter envía; Shift+Enter hace salto de línea.
- Edición (`DeckCard.jsx`): entrada **"Editar descripción"** o **"Agregar descripción"** en el
  menú, según si ya tiene una. Abre un formulario con contador `n/280` en vivo y Escape para
  cancelar.
- Lectura: la descripción se muestra bajo el contador de palabras, con `line-clamp-2` (dos
  líneas y puntos suspensivos) y el texto completo en el atributo `title`.
- La búsqueda de mazos (`DeckList.jsx`) ahora también mira la descripción, no solo el nombre.

**Un detalle de estado**: el borrador de la descripción (`descDraft`) se guarda aparte del de
renombrado (`nameDraft`). `null` significa "no se está editando", y es un valor distinto de `''`
—que es una descripción vacía legítima, la de un mazo al que le sacás el texto—. Mezclarlos
haría que abrir un editor cerrara el otro.

**Verificación de la interfaz.** El lint, el build y el chequeo de temas pasaban, pero eso no
prueba que la descripción *se vea*: los tres son análisis estático. Y no se podía entrar a la
app porque no tengo—ni debo tener—la contraseña de la cuenta. Se armó entonces un banco de
pruebas temporal que monta `DeckCard` con tres mazos falsos (con descripción, sin descripción, y
con una larga) sobre un contexto de mentira. Sirvió para confirmar en el navegador: tres tarjetas
renderizadas, descripciones visibles, la larga cortada exactamente a dos líneas
(`-webkit-line-clamp: 2` y `overflow: hidden` medidos con `getComputedStyle`, no a ojo),
el menú diciendo "Editar descripción" en un caso y "Agregar descripción" en el otro, y el
editor abriendo con el texto precargado, `maxLength=280` y el contador marcando `95/280`.

El banco tuvo dos fallos propios antes de funcionar, los dos de rutas:

1. Los archivos viven **dentro** de `src/`, así que `import ... from './src/components/DeckCard'`
   no resuelve. Va `'./components/DeckCard'`.
2. La página quedaba en blanco **sin ningún error en consola**. La causa era que `ThemeProvider`
   llama a `useAuth()`, y al no haber `AuthProvider` encima el hook lanza y React desmonta el
   árbol entero en silencio. Se añadió un `AuthContext.Provider` falso y aparecieron las tres
   tarjetas. Vale recordarlo: un árbol de React que queda vacío casi siempre es una excepción
   durante el render, y el vendor de React no siempre la imprime.

Con la verificación hecha, los tres archivos del banco se borraron: no quedan en el repositorio.

---

### IA con key propia y multi-proveedor (RF6 / RF7)

La pregunta que abrió esto fue de manchax: *"¿todos los usuarios están usando mi API key de
Gemini?"*. La respuesta era sí — una sola key del servidor, sin ningún tope, compartida por
todos. Con dos usuarios no es un problema; con cien es una cuota que se agota un domingo.

Se resolvió en tres piezas: rate limit, key propia, y adaptadores.

#### El problema de seguridad que definió el diseño

El primer intento natural era guardar la key del usuario en `profiles`, que ya existe y ya
tiene su fila por usuario. **Era una trampa.** La política de SELECT de `profiles` es
`qual: true` para cualquier usuario autenticado (de ahí sale Explorar), así que una columna
`ai_api_key` en esa tabla sería legible por **todos los usuarios logueados**:

```sql
select id, username, ai_api_key from profiles;  -- fuga total, sin ningún error
```

RLS filtra **filas, no columnas**: no hay forma de expresar "que todos lean la fila pero solo
el dueño lea esta columna". La solución real es una tabla aparte, que es la que se usa:

| Tabla | Políticas | Se puede leer desde el cliente |
|---|---|---|
| `profiles` | SELECT `true` | todo (nombre, avatar, bio, apariencia) |
| `user_ai_keys` | INSERT/UPDATE/DELETE del dueño, **sin SELECT** | nada — solo `service_role` |

De ahí sale una consecuencia que atraviesa toda la UI: **el usuario no puede volver a leer su
propia key**. Ni él. Entonces `AiProvider` no expone `apiKey` (sería mentir) sino `hasKey`, que
es lo que la interfaz necesita para decir "configurada · reemplazar" o "sin configurar". El
formulario siempre arranca vacío y el botón dice "Reemplazar", no "Ver".

Un detalle de RLS que vale recordar: con RLS activo y **sin** política de SELECT, un `select`
no devuelve error — devuelve **cero filas**. Así que "no hay filas" no distingue "no configuró
nada" de "no tengo permiso para verlo". Para este caso da igual (en ambos no hay key propia),
pero es una confusión que puede costar caro en otras tablas.

#### Rate limit sin pg_cron

El plan gratuito de Supabase no tiene `pg_cron` (verificado: las extensiones instaladas son
`pg_graphql`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`). Sin
job programado no hay limpieza automática de contadores, así que la RPC hace dos cosas:

1. **Limpia lo viejo en cada llamada** (`delete from ai_usage where window_start < now() - 2 days`).
   Oportunista pero suficiente: la tabla se mantiene chica sola.
2. **Cuenta e incrementa en una sola transacción** con un `insert ... on conflict do update
   ... returning`. Contar y decidir en dos pasos deja una carrera: dos peticiones simultáneas
   del mismo usuario podrían leer `calls = 19` las dos y pasar las dos.

Y un detalle de comportamiento: cuando se pasa del tope, **se deshace el incremento**. Si los
rechazos contaran, el que insiste nunca podría volver a usar la IA — su contador solo subiría.
Es la diferencia entre un límite y un castigo.

Verificado con una prueba real (5 llamadas, tope 3): las tres primeras pasan, las dos
siguientes se bloquean. No se confió en que funcionara: se midió.

Cuando el usuario trae su key, el rate limit **no aplica**: el gasto es suyo y merece usarlo
sin tope nuestro.

#### Adaptadores: por qué el RF7 es más chico de lo que parece

La lista del RF7 (Claude, Qwen, ChatGPT, Gemini, Hunyuan, NIM, OpenRouter, DeepSeek) parece
pedir ocho integraciones. No las pide: **casi todos exponen la misma API que OpenAI**
(`POST /chat/completions` con un array `messages`), así que los cubre un solo adaptador
cambiando `baseUrl` y modelo. DeepSeek, Qwen, OpenRouter, Groq y NIM entran por ahí sin código
nuevo. Quedan fuera del molde Gemini (`contents`/`system_instruction`, key por query string) y
Anthropic (`system` aparte, header `anthropic-version`) — cada uno necesita lo suyo.

Hoy hay dos adaptadores, que cubren todo lo que se puede probar sin pagar. Sumar Anthropic es
agregar una función en `providers.ts` y extender el `CHECK` de la migración. **Hay tres lugares
que tienen que coincidir** cuando se agrega un proveedor: el adaptador, el catálogo
`aiProviders.js`, y el `CHECK` de la base. Si no, la constraint rechaza una configuración que
la UI ofrece.

Detalle que apareció al escribir el adaptador de OpenAI: `response_format: {type:'json_object'}`
**no lo soportan todos** los servicios compatibles. En vez de rendirse ante el 400, se
reintenta sin ese campo — el prompt ya pide JSON, así que normalmente alcanza. Y como varios
modelos envuelven la respuesta en un bloque markdown (` ```json … ``` `) cuando no hay
`response_format`, el parser lo desempaqueta antes de parsear. Sin eso, la generación se
perdería entera y el usuario vería "respuesta inesperada".

#### Verificación

- Base: políticas comprobadas (`INSERT`/`UPDATE`/`DELETE` del dueño, **ninguna** de SELECT),
  y la RPC probada con 5 llamadas y tope 3.
- UI: `lint` y `build` en verde, y la sección montada en el navegador con un banco temporal.
  Se confirmó el estado inicial ("Usando la API key de Kathe · hasta 20 por hora"), el
  formulario con Gemini seleccionado y sin campo de URL base, el cambio a DeepSeek
  auto-rellenando `deepseek-chat` y sus sugerencias, y el caso "Otro" mostrando el campo de
  URL base con el botón de guardar deshabilitado. Los tres archivos del banco se borraron.
- **Pendiente de deploy**: la Edge Function todavía no está subida, así que en producción
  sigue corriendo la versión vieja (solo Gemini, sin rate limit).


