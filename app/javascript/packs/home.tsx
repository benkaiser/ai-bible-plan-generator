import { createPortal } from 'preact/compat';
import styles from './home.css';
import plans from './data/sample_plans';
// use styles to avoid tree-shaking
+styles;

import { h, render, Component } from 'preact';
import HomePlan from './components/HomePlan';
const suggestions = plans.map(plan => plan.name);

interface IDynamicTextState {
  suggestionIndex: number;
  charIndex: number;
  fadeIn: boolean;
  fadeOut: boolean;
}

class DynamicText extends Component<{}, IDynamicTextState> {
  private typingSpeed: number;
  private pauseDuration: number;
  private emptyDuration: number;

  constructor(props) {
    super(props);
    this.state = {
      suggestionIndex: 0,
      charIndex: 0,
      fadeIn: true,
      fadeOut: false
    };
    this.typingSpeed = 40;
    this.pauseDuration = 5000;
    this.emptyDuration = 0;
  }

  componentDidMount() {
    this.setState({ charIndex: suggestions[0].length }, () => {
      setTimeout(() => {
        this.setState({ fadeIn: false, fadeOut: true });
        this.eraseSuggestion();
      }, this.pauseDuration);
    });
  }

  typeSuggestion = () => {
    const { suggestionIndex, charIndex } = this.state;

    if (charIndex < suggestions[suggestionIndex].length) {
      this.setState({ charIndex: charIndex + 1 }, () => {
        setTimeout(this.typeSuggestion, this.typingSpeed);
      });
    } else {
      this.setState({ fadeIn: true, fadeOut: false});
      setTimeout(() => {
        this.setState({ fadeIn: false, fadeOut: true });
        this.eraseSuggestion();
      }, this.pauseDuration);
    }
  }

  eraseSuggestion = () => {
    const { suggestionIndex, charIndex } = this.state;

    if (charIndex > 0) {
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
    const { suggestionIndex, charIndex } = this.state;
    const text = suggestions[suggestionIndex].substring(0, charIndex);

    return (
      <span>
        {text}
        <span class="blinking-cursor">|</span>
        { createPortal(<HomePlan isFadingIn={this.state.fadeIn} isFadingOut={this.state.fadeOut} plan={plans[suggestionIndex]} />, document.getElementById('plan-container')) }
      </span>
    );
  }
}

function onLoad() {
  const dynamicTextElement = document.getElementById('dynamic-text');
  const planContainer = document.getElementById('plan-container');
  if (window.location.pathname === '/') {
    dynamicTextElement.innerHTML = '';
    render(<DynamicText />, dynamicTextElement);
  } else {
    if (dynamicTextElement) {
      render(null, dynamicTextElement);
      dynamicTextElement.innerHTML = '';
    }
    if (planContainer) {
      render(null, planContainer);
      planContainer.innerHTML = '';
    }
  }
}

document.addEventListener('turbo:load', () => {
  onLoad();
});