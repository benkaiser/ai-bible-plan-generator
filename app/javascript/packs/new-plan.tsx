import { parse } from 'best-effort-json-parser';
import { render, h, Component, Fragment, createRef } from 'preact';
import { events } from 'fetch-event-stream';
import PlanForm from './components/PlanForm';
import { IPlan, IPlanDay, IPlanRequest, IReading } from './interfaces/IPlan';
import { checkScriptureRangeValidBSB } from './utilities/checkScriptureExistsBSB';
import { ensureBookShortName } from './components/bible/utilities';
import { fakeStream } from './utilities/fakeStream';

const planContainer = document.getElementById('plan-container');

function Plan({ plan }: { plan: IPlan }) {
  if (!plan) {
    return null;
  }
  return (
    <section className="border border-primary rounded my-4 p-4">
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
      <div className="card-header">
        Day {day.day_number}: {day.outline}
      </div>
      <ul className="list-group list-group-flush">
        {day.readings.map(reading => (
          <PlanReading reading={reading} />
        ))}
      </ul>
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

      <a className="ps-2" data-bs-toggle="tooltip" data-bs-original-title={reading.why_selected} title={reading.why_selected}><InfoIcon /></a>
    </li>
  );
}

interface IPlanActionsProps {
  plan: IPlan;
  cover: string;
  completed: boolean;
  generating: boolean;
  isValidating: boolean;
  isValid: boolean;
}

function PlanActions(props: IPlanActionsProps) {
  if (props.generating) {
    // show a boostrap 5 spinner and say "Generating..."
    return (
      <div className="d-flex">
        <div className="spinner-border text-primary" role="status">
        </div>
        <div className="ms-2">Generating...</div>
      </div>
    );
  }
  if (props.isValidating) {
    // show a boostrap 5 spinner and say "Validating..."
    return (
      <div className="d-flex">
        <div className="spinner-border text-primary" role="status">
        </div>
        <div className="ms-2">Validating...</div>
      </div>
    );
  }
  if (!props.isValid) {
    // show an info section explaining that the plan is invalid and they should try with a different prompt
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Invalid Plan</h4>
        <p>The AI generated a plan with scriptures we could not find. Please try a different prompt.</p>
      </div>
    )
  }

  const onSubmit = (action: string) => {
    const nameField = document.getElementById('plan-name') as HTMLInputElement;
    nameField.value = props.plan.title;
    const descriptionField = document.getElementById('plan-description') as HTMLInputElement;
    descriptionField.value = props.plan.description;
    const daysField = document.getElementById('plan-days') as HTMLInputElement;
    daysField.value = JSON.stringify(props.plan.days);
    const form = document.getElementById('plan-form') as HTMLFormElement;
    const coverPhotoField = document.getElementById('plan-cover-photo') as HTMLInputElement;
    coverPhotoField.value = props.cover;
    const actionField = document.getElementById('plan-action') as HTMLInputElement;
    actionField.value = action;
    form.submit();
  };
  return (
    <div className="d-flex gap-2">
      <button className="btn btn-primary" onClick={() => onSubmit('start')} disabled={!props.completed}>Save and Start Plan Today</button>
      <button className="btn btn-info" onClick={() => onSubmit('default')} disabled={!props.completed}>Save Plan</button>
    </div>
  );
}

interface IPlanManagerState {
  isGenerating: boolean;
  isValidating: boolean;
  isValid: boolean;
  planCover: string;
  generationCompleted: boolean;
  plan: IPlan | null;
}

class PlanManager extends Component<{}, IPlanManagerState> {
  constructor(props) {
    super(props);
    this.state = { plan: null, planCover: '', isGenerating: false, isValid: false, isValidating: false, generationCompleted: false };
  }

  setPlan(plan: IPlan) {
    this.setState({ plan });
  }

  onStreamComplete(latestPlan: IPlan) {
    this.setState({ generationCompleted: true, isGenerating: false, isValidating: true });
    this.validatePlan(latestPlan).then((valid: boolean) => {
      this.setState({ isValidating: false, isValid: valid });
    });
  }

  validatePlan(latestPlan: IPlan) {
    let fixingFunctions = [];
    let totalReadings = 0;
    let invalidReadings = 0;

    latestPlan?.days.forEach(day => {
      day.readings.forEach(reading => {
        totalReadings++;
        let isValid = true;
        try {
          const bookId: string = ensureBookShortName(reading.book);
          isValid = checkScriptureRangeValidBSB(bookId, reading.chapter, reading.verse_range);
        } catch (e) {
          // book is not valid
          isValid = false;
        }
        if (!isValid) {
          invalidReadings++;
          console.log('Invalid reading:', reading);
          fixingFunctions.push(() => this.fixReading(day, reading));
        }
      });
    });
    if (totalReadings === 0 || invalidReadings / totalReadings > 0.1) {
      return Promise.resolve(false);
    } else if (fixingFunctions.length === 0) {
      return Promise.resolve(true);
    } else {
      return Promise.all(fixingFunctions.map(fn => fn())).then(() => {
        return true;
      }).catch(() => {
        return false;
      });
    }
  }

  async fixReading(day: IPlanDay, reading: IReading) {
    const response = await fetch('/api/fix_reading', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
      },
      body: JSON.stringify({ day: day, reading: reading })
    });
    const newDay = await response.json();
    // check if each of the readings are now valid, if not, throw an error
    newDay.readings.forEach(newReading => {
      const bookId: string = ensureBookShortName(newReading.book);
      if (!checkScriptureRangeValidBSB(bookId, newReading.chapter, newReading.verse_range)) {
        throw new Error('Invalid reading: ' + newReading.book + ' ' + newReading.chapter + ':' + newReading.verse_range);
      }
    });
    // If all readings are valid, replace that specific day in the plan with the new day, making sure to not mutate the original plan
    this.setState({
      plan: {
        ...this.state.plan,
        days: this.state.plan.days.map(day => day.day_number === newDay.day_number ? newDay : day)
      }
    });
  }

  render() {
    return (
      <Fragment>
        <PlanForm allowSubmit={!this.state.isGenerating} onSubmit={this.onSubmit} />
        <Plan plan={this.state.plan} />
        { (this.state.isGenerating || this.state.generationCompleted) &&
          <PlanActions cover={this.state.planCover} plan={this.state.plan} isValidating={this.state.isValidating} isValid={this.state.isValid} generating={this.state.isGenerating} completed={this.state.generationCompleted} /> }
      </Fragment>
    );
  }

  onSubmit = (request: IPlanRequest) => {
    this.setState({ isGenerating: true, planCover: request.cover });
    // Make an API request to generate the plan
    fetch('/api/generate_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
      },
      body: JSON.stringify({ topic: request.topic, length: request.length })
    })
    .then(async (response) => {
      if (response.ok) {
        let stream = events(response);
        let completion = '';
        let isUsingFakeStream = false;
        for await (let event of stream) {
          if (event.data === '[DONE]') {
            console.log('Stream complete');
            if (!isUsingFakeStream) {
              this.onStreamComplete(parse(completion));
            }
            break;
          }
          const pieceOfData = JSON.parse(event.data);
          if (Array.isArray(pieceOfData)) {
            isUsingFakeStream = true;
            fakeStream(pieceOfData, (chunk) => {
              completion += chunk;
              try {
                const plan = parse(completion);
                console.log(plan);
                this.setPlan(plan);
              } catch (e) {
                console.error(e);
              }
            }, 5, 10).then(() => {
              this.onStreamComplete(parse(completion));
            })
          } else {
            completion += pieceOfData.choices[0]?.delta?.content || '';
            try {
              const plan = parse(completion);
              console.log(plan);
              this.setPlan(plan);
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      this.setState({ isGenerating: false });
    });
  }
}

render(<PlanManager />, planContainer);
