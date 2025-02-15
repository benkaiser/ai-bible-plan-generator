import { render, h, Component, Fragment, createRef } from 'preact';
import ReactBible from './components/bible/ReactBible';
import { ensureBookShortName } from './components/bible/utilities';
import books from './components/bible/books';
import ChapterSelector from './components/ChapterSelector';
import { bibleHeaderContainer } from './bible.module.css';
import PageActions from './components/PageActions';

interface IBibleContainerProps {}

interface IBibleContainerState {
  book: string;
  chapter: number;
}

class BibleContainer extends Component<IBibleContainerProps, IBibleContainerState> {
  constructor(props) {
    super(props);
    const urlParts = window.location.pathname.split('/');
    const book = ensureBookShortName(urlParts[2] || 'GEN');
    const chapter = parseInt(urlParts[3]) || 1;

    this.state = {
      book: book,
      chapter: chapter
    };
  }

  render() {
    return (
      <Fragment>
        <div className={bibleHeaderContainer}>
          <h1>{this.bookInfo.name} {this.state.chapter}</h1>
          <div>
            <ChapterSelector defaultBook={this.state.book} defaultChapter={this.state.chapter} onChange={this.onChangeChapter} />
            <PageActions onNext={this.onNext} onPrevious={this.onPrevious} showNext={this.isNextAvailable()} showPrevious={this.isPreviousAvailable()} />
          </div>
        </div>
        <ReactBible book={this.state.book} chapter={this.state.chapter} />
        <PageActions onNext={this.onNext} onPrevious={this.onPrevious} showNext={this.isNextAvailable()} showPrevious={this.isPreviousAvailable()} />
      </Fragment>
    );
  }

  private onChangeChapter = (book: string, chapter: number) => {
    this.setState({ book: book, chapter: chapter });
  }

  private onNext = () => {
    const { book, chapter } = this.state;
    const bookInfo = this.bookInfo;
    if (chapter < bookInfo.numberOfChapters) {
      this.setState({ chapter: chapter + 1 });
    } else {
      const nextBookIndex = books.findIndex(b => b.id === book) + 1;
      if (nextBookIndex < books.length) {
        this.setState({ book: books[nextBookIndex].id, chapter: 1 });
      }
    }
  }

  private onPrevious = () => {
    const { book, chapter } = this.state;
    if (chapter > 1) {
      this.setState({ chapter: chapter - 1 });
    } else {
      const previousBookIndex = books.findIndex(b => b.id === book) - 1;
      if (previousBookIndex >= 0) {
        const previousBook = books[previousBookIndex];
        this.setState({ book: previousBook.id, chapter: previousBook.numberOfChapters });
      }
    }
  }

  private isNextAvailable = () => {
    const { book, chapter } = this.state;
    const bookInfo = this.bookInfo;
    return !(book === 'REV' && chapter === bookInfo.numberOfChapters);
  }

  private isPreviousAvailable = () => {
    const { book, chapter } = this.state;
    return !(book === 'GEN' && chapter === 1);
  }

  private get bookInfo(): { name: string, id: string, numberOfChapters: number } {
    return books.find(b => b.id === this.state.book);
  }
}

render(<BibleContainer />, document.getElementById('bible-container'));
