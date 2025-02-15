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