import DeckList from '../components/DeckList';
import FileImporter from '../components/FileImporter';
import PdfImporter from '../components/PdfImporter';

/** Pantalla de inicio: la grilla de mazos más los dos importadores. */
export default function DecksPage() {
  return (
    <>
      <DeckList />

      <div className="w-full max-w-6xl mx-auto px-6 pb-16">
        <FileImporter />
        <PdfImporter />
      </div>
    </>
  );
}
