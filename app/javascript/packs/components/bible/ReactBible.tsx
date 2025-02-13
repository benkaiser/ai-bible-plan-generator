// this component takes in three props, book, chapter and verseRange, and displays the extracted chapter from the bible API:
// https://bible.helloao.org/api/BSB/1JN/1.json
// <Bible book="1JN" chapter="1" verseRange="1-2" />
// it also accepts books as full names, e.g. <Bible book="1 John" chapter="1" verseRange="1-2" />
// it also supports a "lookup" which includes all 3 props, e.g. <Bible lookup="1JN 1:1-2" />
import { h, Component } from 'preact';
import { ensureBookShortName } from './utilities';
import { BibleClient, BibleCollection } from '@gracious.tech/fetch-client';
import * as fetchCss from '@gracious.tech/fetch-client/client.css';
import * as bibleCustomCss from './bible.module.css';

// avoid tree-shaking, use the fetchCss import
+fetchCss;
+bibleCustomCss;

interface IBibleProps {
  book?: string;
  chapter?: number | string;
  verseRange?: string;
  lookup?: string;
  isReadingExapandable?: boolean;
}

interface IBibleState {
  isLoading?: boolean;
  showFullChapter?: boolean;
  contents?: string;
}

let cachedCollection: BibleCollection | null = null;

async function getBibleClient(): Promise<BibleCollection> {
  if (cachedCollection) {
    return cachedCollection;
  }
  const client = new BibleClient();
  cachedCollection = await client.fetch_collection();
  return cachedCollection;
}

async function getPassage(book: string, chapter: number, start_verse?: number, end_verse?: number): Promise<string> {
  const collection = await getBibleClient();
  const collectionBook = await collection.fetch_book('eng_bsb', book.toLowerCase());
  if (!start_verse) {
    return await collectionBook.get_chapter(chapter, { attribute: false });
  } else {
    return await collectionBook.get_passage(chapter, start_verse, chapter, end_verse, { attribute: false });
  }
}

export default class ReactBible extends Component<IBibleProps, IBibleState> {
  constructor(props: IBibleProps) {
    super(props);
    this.state = {
      isLoading: true
    };
  }

  async componentDidMount() {
    let { book, chapter, verseRange, lookup } = this.props;
    if (lookup) {
      [book, chapter, verseRange] = lookup.split(' ');
    }
    const bookId: string = ensureBookShortName(book);
    this.fetchChapter(bookId, chapter, verseRange);
  }

  async componentDidUpdate(prevProps: IBibleProps) {
    if (prevProps.lookup !== this.props.lookup || prevProps.book !== this.props.book || prevProps.chapter !== this.props.chapter || prevProps.verseRange !== this.props.verseRange) {
      let { book, chapter, verseRange, lookup } = this.props;
      if (lookup) {
        [book, chapter, verseRange] = lookup.split(' ');
      }
      this.setState({ isLoading: true, showFullChapter: !verseRange });
      const bookId: string = ensureBookShortName(book);
      this.fetchChapter(bookId, chapter, verseRange);
    }
  }

  async fetchChapter(book: string, chapter: string | number, verseRange?: string) {
    const start: number | undefined = verseRange ? this._verseRangeStart(verseRange) : undefined;
    const end: number | undefined = verseRange ? this._verseRangeEnd(verseRange) : undefined;
    const isFullChapter = !verseRange;
    const chapterAsNumber: number = parseInt(chapter as string, 10);
    const wholeChapter = await getPassage(book, chapterAsNumber);
    if (isFullChapter) {
      this.setState({ contents: wholeChapter, isLoading: false, showFullChapter: true });
      return;
    } else {
      const contents = await getPassage(book, chapterAsNumber, start, end);
      this.setState({ contents: contents, isLoading: false, showFullChapter: wholeChapter === contents });
    }
  }

  private _verseRangeStart(verseRange: string): number {
    return parseInt(verseRange.split('-')[0], 10);
  }

  private _verseRangeEnd(verseRange: string): number {
    const parse: string[] = verseRange.split('-');
    if (parse.length === 1) {
      return parseInt(parse[0], 10);
    }
    return parseInt(parse[1], 10);
  }

  render() {
    const { contents, isLoading, showFullChapter } = this.state;
    if (!contents || isLoading) {
      return (
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      );
    }

    const handleShowFullChapter = () => {
      this.setState({ showFullChapter: true }, () => {
        let { book, chapter, lookup } = this.props;
        if (lookup) {
          [book, chapter] = lookup.split(' ');
        }
        this.fetchChapter(ensureBookShortName(book), chapter);
      });
    };

    return (
      <div>
        <div className="fetch-bible" dangerouslySetInnerHTML={{ __html: this.state.contents }} />
        {this.props.isReadingExapandable && !showFullChapter && (
          <div>
            <button className="btn btn-link" onClick={handleShowFullChapter}>
              Show full chapter
            </button>
          </div>
        )}
      </div>
    );
  }
}