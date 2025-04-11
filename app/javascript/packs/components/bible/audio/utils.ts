import { parse } from "best-effort-json-parser";
import { ensureAudioBookId } from "../utilities";

// Simple cache variable to store haysTimes data for the browser session
let haysTimesCache: any = null;

async function fetchHaysTimes() {
  if (haysTimesCache) {
    return haysTimesCache;
  }
  // this is an import, but because we aren't using esm, esbuild won't actually let us code split it properly
  const module = await import('./hays.js');
  const haysTimes = module.haysTimes;
  if (haysTimes) {
    haysTimesCache = haysTimes;
  }
  return haysTimes;
}

export async function getHaysTimeForLookup(bookId: string, chapter: number): Promise<number[]> {
  const haysTimes = await fetchHaysTimes();
  if (!haysTimes) {
    return [];
  }
  bookId = ensureAudioBookId(bookId);

  const chapterTimings = haysTimes[`${bookId} ${chapter}`];
  return chapterTimings || [];
}