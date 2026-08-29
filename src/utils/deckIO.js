export function downloadDeckTxt(deck) {
  const lines = Object.entries(deck.words || {}).map(([q, a]) => {
    const safeQ = String(q).replaceAll('\t', ' ');
    const safeA = String(a).replaceAll('\t', ' ').replaceAll('"', '""');
    return `${safeQ}\t"${safeA}"`;
  });
  const body = lines.join('\n');

  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (deck.name || 'mazo').replace(/[^a-z0-9-_]+/gi, '_');
  a.download = `${safeName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAllDecksTxt(decks) {
  if (!decks || decks.length === 0) return;
  decks.forEach((deck, idx) => {
    setTimeout(() => downloadDeckTxt(deck), idx * 120);
  });
}
