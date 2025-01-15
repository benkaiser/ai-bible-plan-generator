import { parse } from 'best-effort-json-parser';
import { render, h, Component, Fragment, createRef } from 'preact';
import PlanForm from './components/PlanForm';
import { IPlan, IPlanDay, IPlanRequest, IReading } from './interfaces/IPlan';
import ReactHintFactory from 'react-hint'
import 'react-hint/css/index.css'

const ReactHint = ReactHintFactory({createElement: h, Component, createRef})
const planContainer = document.getElementById('plan-container');

function Plan({ plan }: { plan: IPlan }) {
  if (!plan) {
    return null;
  }
  return (
    <section className="border rounded my-4 p-4 bg-light bg-gradient">
      <h2>{plan.title}</h2>
      <p>{plan.description}</p>
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
        <ul className="list-group list-group-flush">
          {day.readings.map(reading => (
            <PlanReading reading={reading} />
          ))}
          </ul>
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
    </svg>
  )
}

function PlanReading({ reading }: { reading: IReading }) {
  return (
    <li key={reading.book + reading.chapter} className="list-group-item">
      {reading.book} {reading.chapter}{reading.verse_range && `:${reading.verse_range}`}

      <a className="ps-2" data-rh={reading.why_selected}><InfoIcon /></a>
    </li>
  );
}

interface IPlanActionsProps {
  plan: IPlan;
  completed: boolean;
}

function PlanActions(props: IPlanActionsProps) {
  const onSubmit = () => {
    const nameField = document.getElementById('plan-name') as HTMLInputElement;
    nameField.value = props.plan.title;
    const descriptionField = document.getElementById('plan-description') as HTMLInputElement;
    descriptionField.value = props.plan.description;
    const daysField = document.getElementById('plan-days') as HTMLInputElement;
    daysField.value = JSON.stringify(props.plan.days);
    const form = document.getElementById('new_plan') as HTMLFormElement;
    form.submit();
  };
  return (
    <div className="d-flex">
      <button className="btn btn-primary" onClick={onSubmit} disabled={!props.completed}>Save Plan</button>
    </div>
  );
}

interface IPlanManagerState {
  isGenerating: boolean;
  generationCompleted: boolean;
  plan: IPlan | null;
}

class PlanManager extends Component<{}, IPlanManagerState> {
  constructor(props) {
    super(props);
    this.state = { plan: null, isGenerating: false, generationCompleted: false };
  }

  setPlan(plan: IPlan) {
    this.setState({ plan });
  }

  onStreamComplete() {
    this.setState({ isGenerating: false, generationCompleted: true });
  }

  render() {
    return (
      <Fragment>
        <PlanForm allowSubmit={!this.state.isGenerating} onSubmit={this.onSubmit} />
        <Plan plan={this.state.plan} />
        { (this.state.isGenerating || this.state.generationCompleted) &&
          <PlanActions plan={this.state.plan} completed={this.state.generationCompleted} /> }

        <ReactHint events={{hover: true}} />
      </Fragment>
    );
  }

  onSubmit = (request: IPlanRequest) => {
    this.setState({ isGenerating: true });
    // Make an API request to generate the plan
    fetch('/api/generate_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
      },
      body: JSON.stringify({ topic: request.topic, length: request.length })
    })
    .then(response => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let completion = '';

      const read = () => {
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
                this.onStreamComplete();
                console.log(completion);
              } else {
                completion += data;
                try {
                  const plan = parse(completion);
                  console.log(plan);
                  this.setPlan(plan);
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
      this.setState({ isGenerating: false });
    });
  }
}

render(<PlanManager />, planContainer);
