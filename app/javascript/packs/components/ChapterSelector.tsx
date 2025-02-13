import { h, Component, createRef } from 'preact';
import books from './bible/books';

interface IChapterSelectorProps {
  defaultBook?: string;
  defaultChapter?: number;
  onChange: (book: string, chapter: number) => void;
}

interface IChapterSelectorState {
  selectedBook: string;
  numberOfChapters: number;
}

export default class ChapterSelector extends Component<IChapterSelectorProps, IChapterSelectorState> {
  private bookRef = createRef<HTMLSelectElement>();
  private chapterRef = createRef<HTMLSelectElement>();

  constructor(props: IChapterSelectorProps) {
    super(props);
    const defaultBook = props.defaultBook || books[0].id;
    const bookInfo = books.find(b => b.id === defaultBook);
    this.state = {
      selectedBook: defaultBook,
      numberOfChapters: bookInfo ? bookInfo.numberOfChapters : 1
    };
  }

  componentDidMount() {
    if (this.bookRef.current && this.chapterRef.current) {
      this.bookRef.current.value = this.props.defaultBook || '';
      this.chapterRef.current.value = (this.props.defaultChapter || 1).toString();
    }
  }

  render() {
    return (
      <form>
        <select className="form-select" ref={this.bookRef} onChange={this.handleBookChange}>
          {books.map(book => <option key={book.id} value={book.id}>{book.name}</option>)}
        </select>
        <select className="form-select" ref={this.chapterRef} onChange={this.handleChapterChange}>
          {Array.from({ length: this.state.numberOfChapters }, (_, i) => i + 1).map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </form>
    );
  }

  private handleBookChange = () => {
    const selectedBook = this.bookRef.current.value;
    const bookInfo = books.find(b => b.id === selectedBook);
    const numberOfChapters = bookInfo ? bookInfo.numberOfChapters : 1;
    this.setState({ selectedBook, numberOfChapters }, () => {
      this.chapterRef.current.value = '1'; // Reset chapter to 1
      this.props.onChange(selectedBook, 1);
    });
  }

  private handleChapterChange = () => {
    const book = this.bookRef.current.value;
    const chapter = parseInt(this.chapterRef.current.value);
    this.props.onChange(book, chapter);
  }
}