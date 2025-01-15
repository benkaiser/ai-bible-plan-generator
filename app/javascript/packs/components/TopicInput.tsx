import { h, Component, createRef, RefObject } from 'preact';

const suggestions = shuffle([
  "God in hard times",
  "Bible on joy",
  "Jesus' parables",
  "Prayers in the Bible",
  "Loving others",
  "God's power in people",
  "Rest and peace",
  "Wisdom for today",
  "Trusting God",
  "God's plan for the world",
  "Hope in Scripture",
  "Faith during trials",
  "Walking with Jesus",
  "God's promises",
  "Healing in the Bible",
  "Forgiveness in Scripture",
  "Overcoming fear",
  "Courage from God",
  "God's love for nations",
  "Justice and mercy",
  "Strength in weakness",
  "The Holy Spirit",
  "Living by faith",
  "Peace in chaos",
  "Light in darkness",
  "God's faithfulness",
  "Jesus' miracles",
  "Bible on humility",
  "God's creation",
  "The heart of worship"
]);

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

interface ITopicInputState {
  suggestionIndex: number;
  charIndex: number;
  cursorVisible: boolean;
}

class TopicInput extends Component<{ inputRef: RefObject<HTMLInputElement> }, ITopicInputState> {
  private typingSpeed: number;
  private pauseDuration: number;
  private emptyDuration: number;
  private cursorInterval: number;

  constructor(props) {
    super(props);
    this.state = {
      suggestionIndex: 0,
      charIndex: 0,
      cursorVisible: true
    };
    this.typingSpeed = 30;
    this.pauseDuration = 3000;
    this.emptyDuration = 200;
  }

  componentDidMount() {
    this.typeSuggestion();
    this.cursorInterval = setInterval(this.toggleCursor, 500);
  }

  componentWillUnmount() {
    clearInterval(this.cursorInterval);
  }

  toggleCursor = () => {
    this.setState((prevState) => ({
      cursorVisible: !prevState.cursorVisible
    }), () => {
      const topicInput = this.props.inputRef.current;
      if (topicInput.placeholder.endsWith('|')) {
        topicInput.placeholder = topicInput.placeholder.slice(0, -1);
      } else {
        topicInput.placeholder += '|';
      }
    });
  }

  typeSuggestion = () => {
    const { suggestionIndex, charIndex, cursorVisible } = this.state;
    const topicInput = this.props.inputRef.current;

    if (charIndex < suggestions[suggestionIndex].length) {
      topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex + 1) + (cursorVisible ? '|' : '');
      this.setState({ charIndex: charIndex + 1 }, () => {
        setTimeout(this.typeSuggestion, this.typingSpeed);
      });
    } else {
      topicInput.placeholder = suggestions[suggestionIndex] + '|';
      setTimeout(this.eraseSuggestion, this.pauseDuration);
    }
  }

  eraseSuggestion = () => {
    const { suggestionIndex, charIndex, cursorVisible } = this.state;
    const topicInput = this.props.inputRef.current;

    if (charIndex > 0) {
      topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex - 1) + (cursorVisible ? '|' : '');
      this.setState({ charIndex: charIndex - 1 }, () => {
        setTimeout(this.eraseSuggestion, this.typingSpeed);
      });
    } else {
      this.setState({
        suggestionIndex: (suggestionIndex + 1) % suggestions.length
      }, () => {
        setTimeout(this.typeSuggestion, this.emptyDuration);
      });
    }
  }

  render() {
    return (
      <input type="text" id="plan-topic" className="form-control my-2" ref={this.props.inputRef} />
    );
  }
}

export default TopicInput;