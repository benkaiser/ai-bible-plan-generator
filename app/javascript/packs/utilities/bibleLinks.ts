import { ensureBookShortName, getBook } from '../components/bible/utilities';
import { IPlanReading } from '../interfaces/IPlanReading';

export enum BibleProvider {
  YouVersion = 'youversion',
  BibleGateway = 'biblegateway',
  BibleHub = 'biblehub'
}

const normalizeBookName = (book: string): string => {
  return getBook(book).name.replace(/\s+/g, '_').toLowerCase();
};

export const getExternalBibleLink = (
  provider: BibleProvider,
  reading: IPlanReading
): string => {
  const { book, chapter, verse_range } = reading;
  const bookShortName = ensureBookShortName(book);
  const bookName = normalizeBookName(bookShortName);

  switch (provider) {
    case BibleProvider.YouVersion:
      // 111 here defaults to the NIV version
      return `https://bible.com/bible/111/${bookShortName}.${chapter}${verse_range ? '.' + verse_range : ''}`;

    case BibleProvider.BibleGateway:
      return `https://www.biblegateway.com/passage/?search=${book}+${chapter}${verse_range ? ':' + verse_range : ''}`;

    case BibleProvider.BibleHub:
      return `https://biblehub.com/niv/${bookName}/${chapter}.htm`;

    default:
      return `https://bible.com/bible/111/${bookShortName}.${chapter}${verse_range ? '.' + verse_range : ''}`;
  }
};

export const getStoredBibleProvider = (): BibleProvider => {
  const stored = localStorage.getItem('preferredBibleProvider');
  return stored as BibleProvider || BibleProvider.YouVersion;
};

export const setStoredBibleProvider = (provider: BibleProvider): void => {
  localStorage.setItem('preferredBibleProvider', provider);
};
