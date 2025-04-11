import { parse } from "best-effort-json-parser";
import { ensureAudioBookId } from "../utilities";

// Simple cache variable to store haysTimes data for the browser session
let haysTimesCache: any = null;

async function fetchHaysTimes() {
  // Return cached data if available
  if (haysTimesCache !== null) {
    return haysTimesCache;
  }

  try {
    // Fetch the JavaScript file
    const response = await fetch("https://tim.z73.com/haysframe/hays.js", {
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get the JavaScript text content
    const jsText = await response.text();

    // Use a contained eval to extract the haysTimes object
    // This approach isolates the evaluation to avoid polluting the global scope
    let result;
    try {
      // Create a function that replaces "export var haysTimes =" with "return "
      const extractScript = jsText.replace(/export\s+var\s+haysTimes\s*=\s*/, 'return ');
      // Create a function from this modified script
      const extractFn = new Function(extractScript);
      // Execute and get the value
      result = extractFn();
    } catch (error) {
      console.error("Error evaluating script:", error);
      // Fallback to regex parsing if eval fails
      const match = jsText.match(/export\s+var\s+haysTimes\s*=\s*(\{[\s\S]*?\});/);
      if (match && match[1]) {
        result = parse(match[1]);
      } else {
        throw new Error("Could not extract haysTimes variable");
      }
    }

    // Store result in cache
    haysTimesCache = result;

    return result;

  } catch (error) {
    console.error("Error fetching haysTimes:", error);
    return null;
  }
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