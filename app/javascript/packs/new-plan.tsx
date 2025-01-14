import { parse } from 'best-effort-json-parser';
import { render, h, Component } from 'preact';
import { useState } from 'preact/hooks';

const planLengthSelect = document.getElementById('plan-length') as HTMLSelectElement;
const topicInput = document.getElementById('plan-topic') as HTMLInputElement;
const customLengthInput = document.getElementById('custom-length') as HTMLInputElement;
const generatePlanButton = document.getElementById('generate-plan') as HTMLButtonElement;
const planContainer = document.getElementById('plan-container');

interface IPlan {
  title: string;
  description: string;
  days: Array<IPlanDay>;
}

interface IPlanDay {
  day_number: number;
  outline: string;
  readings: Array<IReading>;
}

interface IReading {
  book: string;
  chapter: number;
  verse_range?: string;
  why_selected: string;
}

function Plan({ plan }: { plan: IPlan }) {
  if (!plan) {
    return null;
  }
  return (
    <section className="border rounded p-4 bg-light bg-gradient">
      <h2>{plan.title}</h2>
      <div className="plan-container py-2">
        {plan.days && plan.days.map(day => <PlanDay day={day} />)}
      </div>
    </section>
  );
}

function PlanDay({ day }: { day: IPlanDay }) {
  if (!day.readings || !day.outline || day.readings.length === 0) {
    // Since response is streamed, we may receive incomplete days
    return null;
  }
  return (
    <div className="card">
      <div className="card-body">
        <h3>Day {day.day_number}</h3>
        <p>{day.outline}</p>
        <ul>
          {day.readings.map(reading => <PlanReading reading={reading} />)}
        </ul>
      </div>
    </div>
  );
}

function PlanReading({ reading }: { reading: IReading }) {
  return (
    <li>
      <p>{reading.book} {reading.chapter}{reading.verse_range && `:${reading.verse_range}`}</p>
    </li>
  );
}

let globalSetPlan: (plan: IPlan) => void;
class PlanManager extends Component<{}, { plan: IPlan | null }> {
  constructor(props) {
    super(props);
    this.state = { plan: null };
    globalSetPlan = this.setPlan.bind(this);
  }

  setPlan(plan: IPlan) {
    this.setState({ plan });
  }

  render() {
    return (
      <Plan plan={this.state.plan} />
    );
  }
}

render(<PlanManager />, planContainer);

planLengthSelect.addEventListener('change', function() {
  var customLengthGroup = document.getElementById('custom-length-group')!;
  if (this.value === 'custom') {
    customLengthGroup.style.display = 'flex';
  } else {
    customLengthGroup.style.display = 'none';
  }
});

customLengthInput.addEventListener('input', function() {
  var min = parseInt(this.min);
  var max = parseInt(this.max);
  var value = parseInt(this.value);

  if (value < min) {
    this.value = String(min);
  } else if (value > max) {
    this.value = String(max);
  }
});

generatePlanButton.addEventListener('click', function(event) {
  event.preventDefault();

  var topic = topicInput.value;
  var length = planLengthSelect.value;
  if (length === 'custom') {
    length = customLengthInput.value;
  }

  generatePlanButton.disabled = true;

  // Make an API request to generate the plan
  fetch('/api/generate_plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
    },
    body: JSON.stringify({ topic: topic, length: length })
  })
  .then(response => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let completion = '';

    function read() {
      if (!reader) {
        return;
      }
      reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Stream complete');
          return;
        }

        result += decoder.decode(value, { stream: true });
        const lines = result.split('\n\n');
        result = lines.pop(); // Keep the last incomplete line

        lines.forEach(line => {
          // trim whitespace from start of line
          line = line.replace(/^\s+/, '');
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('Stream complete');
              generatePlanButton.disabled = false;
              console.log(completion);
            } else {
              completion += data;
              try {
                const plan = parse(completion);
                console.log(plan);
                globalSetPlan(plan);
              } catch (e) {
                console.error(e);
              }
            }
          }
        });

        read();
      });
    }

    read();
  })
  .catch(error => {
    console.error('Error:', error);
    generatePlanButton.disabled = false;
  });
});

// Cycle through suggestions for the topic input
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
]
);
let suggestionIndex = 0;
let charIndex = 0;
const typingSpeed = 30;
const pauseDuration = 3000;
const emptyDuration = 200;
let cursorVisible = true;

function typeSuggestion() {
  if (charIndex < suggestions[suggestionIndex].length) {
    topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex + 1) + (cursorVisible ? '|' : '');
    charIndex++;
    setTimeout(typeSuggestion, typingSpeed);
  } else {
    topicInput.placeholder = suggestions[suggestionIndex] + '|';
    setTimeout(eraseSuggestion, pauseDuration);
  }
}

function eraseSuggestion() {
  if (charIndex > 0) {
    topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex - 1) + (cursorVisible ? '|' : '');
    charIndex--;
    setTimeout(eraseSuggestion, typingSpeed);
  } else {
    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
    setTimeout(typeSuggestion, emptyDuration);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Toggle cursor visibility every second
setInterval(() => {
  cursorVisible = !cursorVisible;
  if (topicInput.placeholder.endsWith('|')) {
    topicInput.placeholder = topicInput.placeholder.slice(0, -1);
  } else {
    topicInput.placeholder += '|';
  }
}, 500);

typeSuggestion();
