// this component takes in three props, book, chapter and verseRange, and displays the extracted chapter from the bible API:
// https://bible.helloao.org/api/BSB/1JN/1.json
// <Bible book="1JN" chapter="1" verseRange="1-2" />
// it also accepts books as full names, e.g. <Bible book="1 John" chapter="1" verseRange="1-2" />
// it also supports a "lookup" which includes all 3 props, e.g. <Bible lookup="1JN 1:1-2" />
import { h, Component, Fragment, RefObject } from 'preact';
import { ensureBookShortName } from './utilities';
import { ChapterContent, ChapterVerse, FormattedText, InlineHeading, InlineLineBreak, TranslationBookChapter, VerseFootnoteReference } from './APIInterfaces';
import { bibleContainer, lineBreak, fadeIn, firstPoemClass, oddPoemClass, evenPoemClass } from './bible.module.css';

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
  firstVerse?: number;
  contents?: TranslationBookChapter;
  renderedVerses?: ChapterContent[];
}

export default class ReactBible extends Component<IBibleProps, IBibleState> {
  private _verseRefs: HTMLParagraphElement[];
  constructor(props: IBibleProps) {
    super(props);
    this.state = {
      isLoading: true
    };
    this._verseRefs = [];
  }

  async componentDidMount() {
    let { book, chapter, verseRange, lookup } = this.props;
    if (lookup) {
      [book, chapter, verseRange] = lookup.split(' ');
    }
    const bookId: string = ensureBookShortName(book);
    this.fetchChapter(bookId, chapter);
  }

  async componentDidUpdate(prevProps: IBibleProps) {
    if (prevProps.lookup !== this.props.lookup || prevProps.book !== this.props.book || prevProps.chapter !== this.props.chapter || prevProps.verseRange !== this.props.verseRange) {
      this.setState({ isLoading: true, showFullChapter: false });
      let { book, chapter, verseRange, lookup } = this.props;
      if (lookup) {
        [book, chapter, verseRange] = lookup.split(' ');
      }
      const bookId: string = ensureBookShortName(book);
      this.fetchChapter(bookId, chapter);
    }
  }

  async fetchChapter(book: string, chapter: string | number) {
    this.setState({ isLoading: true });
    const response = await fetch(`https://bible.helloao.org/api/BSB/${book}/${chapter}.json`);
    const contents = await response.json();
    const renderedVerses = this.filterToRenderedVerses(contents.chapter.content, this.props.verseRange);
    this.setState({ contents, renderedVerses, isLoading: false });
  }

  private _verseRangeParts(): number[] {
    let { verseRange, lookup } = this.props;
    if (lookup) {
      verseRange = lookup.split(' ')[2];
    }
    if (verseRange && verseRange.length > 0) {
      const parts = verseRange.split('-').map(Number);
      if (parts.length === 2) {
        return parts;
      } else {
        return [parts[0], parts[0]];
      }
    } else {
      const numberOfVerses = this.state.contents.numberOfVerses;
      return [1, numberOfVerses];
    }
  }

  private _verseRangeStart(): number {
    return this._verseRangeParts()[0];
  }

  private _verseRangeEnd(): number {
    return this._verseRangeParts()[1];
  }

  render() {
    const { contents, renderedVerses, isLoading, showFullChapter } = this.state;
    if (!contents || isLoading) {
      return (
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      );
    }

    const handleShowFullChapter = () => {
      console.log(this._verseRefs);
      this.setState({ renderedVerses: contents.chapter.content, showFullChapter: true }, () => {
        const startVerse = this._verseRangeStart();
        if (this._verseRefs[startVerse]) {
          this._verseRefs[startVerse]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      });
    };

    const totalVerses = this.state.contents.numberOfVerses;
    const showTopButton = this._verseRangeStart() > 1;
    const showBottomButton = this._verseRangeEnd() < totalVerses;

    return (
      <div className={bibleContainer}>
        {renderedVerses.map((content, index) => {
          let lastPoemNumber: number = 0;
          let lastVerseItem: (string | FormattedText | InlineHeading | InlineLineBreak | VerseFootnoteReference);
          switch (content.type) {
            case 'heading':
              return <h3 key={index} className={fadeIn}>{content.content.join(' ')}</h3>;
            case 'line_break':
              return <div key={index} className={`${fadeIn} ${lineBreak}`}></div>;
            case 'verse':
              const startsWithPoem = content.content.length > 0 && typeof content.content[0] !== 'string' && 'text' in content.content[0] && content.content[0].poem !== undefined;
              return (
                <p key={index} className={fadeIn} ref={el => this._verseRefs[content.number] = el}>
                  { !startsWithPoem && <sup>{content.number}</sup> }
                  {content.content.map((item, subIndex) => {
                    if (typeof item === 'string') {
                      return item;
                    } else if ('text' in item) {
                      const isPoem = item.poem !== undefined;
                      const isLineBreak = isPoem && lastPoemNumber !== item.poem && subIndex !== 0;
                      let poemClassName = '';
                      if (isPoem) {
                        if (lastPoemNumber === 0) {
                          poemClassName = firstPoemClass;
                        } else if (lastPoemNumber === item.poem && lastVerseItem && (lastVerseItem as VerseFootnoteReference).noteId !== undefined) {
                          poemClassName = '';
                        } else if (item.poem % 2 == 1) {
                          poemClassName = oddPoemClass;
                        } else {
                          poemClassName = evenPoemClass;
                        }
                      }
                      lastPoemNumber = item.poem || 0;
                      lastVerseItem = item;
                      return (
                        <Fragment key={subIndex}>
                          {isLineBreak && <br />}
                          <span
                            className={`${item.wordsOfJesus ? 'words-of-jesus' : ''} ${poemClassName}`}
                          >
                            { poemClassName === firstPoemClass && startsWithPoem && <sup>{content.number}</sup> }
                            {item.text}
                          </span>
                        </Fragment>
                      );
                    } else if ('heading' in item) {
                      return <strong key={subIndex}>{item.heading}</strong>;
                    } else if ('lineBreak' in item) {
                      return <div key={subIndex} className={lineBreak}></div>;
                    } else if ('noteId' in item) {
                      lastVerseItem = item;
                      return " ";
                      // return <sup key={subIndex}>{item.noteId}</sup>;
                    }
                  })}
                </p>
              );
            case 'hebrew_subtitle':
              return (
                <p key={index} className={`${fadeIn} hebrew-subtitle`}>
                  {content.content.map((item, subIndex) => {
                    if (typeof item === 'string') {
                      return item;
                    } else if ('text' in item) {
                      return (
                        <span key={subIndex} className={item.wordsOfJesus ? 'words-of-jesus' : ''}>
                          {item.text}
                        </span>
                      );
                    } else if ('noteId' in item) {
                      return " ";
                      // return <sup key={subIndex}>{item.noteId}</sup>;
                    }
                    return null;
                  })}
                </p>
              );
            default:
              return null;
          }
        })}
        {this.props.isReadingExapandable && renderedVerses && !showFullChapter && (showBottomButton || showTopButton) && (
          <div>
            <button className="btn btn-link" onClick={handleShowFullChapter}>
              Show full chapter
            </button>
          </div>
        )}
      </div>
    );
  }

  // contents consists of types verse, heading and line_break
  private filterToRenderedVerses(content: ChapterContent[], verseRange: string | undefined) {
    if (!verseRange) {
      return content;
    }
    const [start, end] = verseRange.split('-').map(Number);
    if (isNaN(end)) {
      return content.filter(verse => (verse as ChapterVerse).number === start);
    }
    let filteredContents = [];
    for (let i = 0; i < content.length; i++) {
      const verse = content[i];
      if (verse.type === 'verse' && verse.number >= start && verse.number <= end) {
        filteredContents.push(verse);
        if (verse.number === end) {
          break;
        }
      } else if (verse.type === 'verse' && verse.number < start) {
        filteredContents = [];
      } else if (verse.type === 'heading' || verse.type === 'line_break' || verse.type === 'hebrew_subtitle' ) {
        filteredContents.push(verse);
      }
    }
    // handle condition where there is only a line_break preceding the range, drop the line_break
    if (filteredContents[0].type === 'line_break') {
      filteredContents.shift();
    }
    return filteredContents;
  }
}