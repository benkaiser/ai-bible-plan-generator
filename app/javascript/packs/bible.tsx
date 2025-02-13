import { render, h, Component, Fragment, createRef } from 'preact';
import ReactBible from './components/bible/ReactBible';
import { ensureBookShortName } from './components/bible/utilities';
import books from './components/bible/books';
import ChapterSelector from './components/ChapterSelector';
import { bibleHeaderContainer } from './bible.module.css';

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
          <ChapterSelector defaultBook={this.state.book} defaultChapter={this.state.chapter} onChange={this.onChangeChapter} />
        </div>
        <ReactBible book={this.state.book} chapter={this.state.chapter} />
      </Fragment>
    );
  }

  private onChangeChapter = (book: string, chapter: number) => {
    this.setState({ book: book, chapter: chapter });
  }

  private get bookInfo(): { name: string, id: string } {
    return books.find(b => b.id === this.state.book);
  }
}

render(<BibleContainer />, document.getElementById('bible-container'));
