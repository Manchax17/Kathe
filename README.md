# Kathe · Tu cuaderno de palabras

Kathe es una app de flashcards con estética *cozy study*: papel cálido, tipografía serif, y cero
distracciones. Pensada para repaso espaciado en sesiones cortas, con un modo claro y un modo
oscuro que respetan tu vista.

Inspirada en Anki, pero más visual y con un entorno cuidado.

## Características

- **Mazos y palabras** guardados en Supabase (Postgres + Auth).
- **Importar** desde archivos `.txt` estilo Anki (pregunta ⇥ respuesta por línea) o pegar directo.
- **Modo estudio** con cola inteligente: si fallás, la palabra vuelve más tarde; si acertás, sale.
  Atajos: `Espacio` para revelar, `1` incorrecto, `2` correcto.
- **Modos de orden** por mazo: inserción, alfabético, inverso, aleatorio de sesión, aleatorio con
  semilla diaria.
- **Descargar** cualquier mazo como `.txt` (compatible con Anki).
- **Modo oscuro / claro** con detección automática del sistema.
- **IA: PDF → flashcards** — subí un PDF y Gemini extrae los conceptos clave
  como tarjetas editables antes de guardarlas en un mazo.
- **Estadísticas locales**: racha de días, dominio a la primera, puntos por sesión.
- **Renombrar** y **eliminar** mazos desde el menú ⋯ de cada card.

## Stack

- React 19 + Vite 8
- TailwindCSS 4 (con variables CSS para temas)
- Supabase JS v2 (Auth + Postgres)
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

Activá **Email auth** en `Authentication → Providers`.

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

## Estructura

```
src/
  components/    Auth, DeckList, DeckCard, FlashcardView, StudyMode,
                 FileImporter, PdfImporter, CardsReviewModal,
                 SettingsModal, Logo, ThemeToggle
  hooks/         useTheme
  utils/         studyQueue, deckIO, stats, pdfText, aiClient
  supabaseClient.js
supabase/
  migrations/    SQL de la tabla decks + study_order
  functions/     extract-cards (Edge Function con Gemini)
```

Diseñado por **Manchax**.
