// this component takes in three props, book, chapter and verseRange, and displays the extracted chapter from the bible API:
// https://bible.helloao.org/api/BSB/1JN/1.json
// <Bible book="1JN" chapter="1" verseRange="1-2" />
// it also accepts books as full names, e.g. <Bible book="1 John" chapter="1" verseRange="1-2" />
// it also supports a "lookup" which includes all 3 props, e.g. <Bible lookup="1JN 1:1-2" />
import { h, Component } from 'preact';
import { ensureBookShortName } from './utilities';
import { ChapterContent, ChapterVerse, TranslationBookChapter } from './APIInterfaces';

interface IBibleProps {
  book?: string;
  chapter?: number | string;
  verseRange?: string;
  lookup?: string;
}

interface IBibleState {
  contents?: TranslationBookChapter;
  renderedVerses?: ChapterContent[];
}

export default class ReactBible extends Component<IBibleProps, IBibleState> {
  constructor(props: IBibleProps) {
    super(props);
    this.state = {
    };
  }

  async componentDidMount() {
    let { book, chapter, verseRange, lookup } = this.props;
    if (lookup) {
      [book, chapter, verseRange] = lookup.split(' ');
    }
    const bookId: string = ensureBookShortName(book);
    this.fetchChapter(bookId, chapter);
  }

  async fetchChapter(book: string, chapter: string | number) {
    const response = await fetch(`https://bible.helloao.org/api/BSB/${book}/${chapter}.json`);
    const contents = await response.json();
    const renderedVerses = this.filterToRenderedVerses(contents.chapter.content, this.props.verseRange);
    this.setState({ contents, renderedVerses });
  }

  render() {
    const { contents, renderedVerses } = this.state;
    if (!contents) {
      return (
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      );
    }
    return (
      <div>
        <h2>{`${contents.book.name} ${contents.chapter.number}`}</h2>
        {renderedVerses.map((content, index) => {
          switch (content.type) {
            case 'heading':
              return <h3 key={index}>{content.content.join(' ')}</h3>;
            case 'line_break':
              return <br key={index} />;
            case 'verse':
              return (
                <p key={index}>
                  <sup>{content.number}</sup>
                  {content.content.map((item, subIndex) => {
                    if (typeof item === 'string') {
                      return item;
                    } else if ('text' in item) {
                      return (
                        <span key={subIndex} className={item.wordsOfJesus ? 'words-of-jesus' : ''}>
                          {item.text}
                        </span>
                      );
                    } else if ('heading' in item) {
                      return <strong key={subIndex}>{item.heading}</strong>;
                    } else if ('lineBreak' in item) {
                      return <br key={subIndex} />;
                    } else if ('noteId' in item) {
                      return <sup key={subIndex}>{item.noteId}</sup>;
                    }
                    return null;
                  })}
                </p>
              );
            case 'hebrew_subtitle':
              return (
                <p key={index} className="hebrew-subtitle">
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
                      return <sup key={subIndex}>{item.noteId}</sup>;
                    }
                    return null;
                  })}
                </p>
              );
            default:
              return null;
          }
        })}
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
      } else if (verse.type === 'verse' && verse.number < start) {
        filteredContents = [];
      } else if (verse.type === 'heading' || verse.type === 'line_break' || verse.type === 'hebrew_subtitle') {
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