import books from './books';

// Converts english names of bible books to their short form, e.g. "1 John" -> "1JN"
// if the book is already the short form, it returns the same string.
// If the book is not found in the list of books, it throws an error.
export function ensureBookShortName(bookname: string): string {
  const lookup = bookname.toLowerCase();
  const book = books.find(b => b.id.toLowerCase() === lookup || b.name.toLowerCase() === lookup || b.otherNames?.includes(lookup));
  if (book) {
    return book.id;
  } else {
    throw new Error(`Book name "${bookname}" not found in books list`);
  }
}

export function ensureAudioBookId(bookname: string): string {
  const bookId = ensureBookShortName(bookname);
  const book = books.find(b => b.id === bookId);
  if (book) {
    if (book.audioBookId) {
      return book.audioBookId;
    }
    // If no audioBookId is found, return the original bookId but only capitalize the first non-numeric character, e.g. "1JN" -> "1Jn" and "GEN" -> "Gen"
    const match = bookId.match(/^(\d*)([A-Z]+)$/);
    if (match) {
      const [_, digits, letters] = match;
      const capitalized = letters[0] + letters.slice(1).toLowerCase();
      return digits + capitalized;
    }
    // Fallback if unexpected format
    return bookId;
  }
}

export function getBook(bookShortname: string): { name: string, id: string, numberOfChapters: number } {
  const book = books.find(b => b.id === bookShortname);
  if (book) {
    return book;
  } else {
    throw new Error(`Book short name "${bookShortname}" not found in books list`);
  }
}