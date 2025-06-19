import { parse } from 'best-effort-json-parser';
import { render, h, Component, Fragment, createRef, RefObject } from 'preact';
import { events } from 'fetch-event-stream';
import PlanForm from './components/PlanForm';
import { IPlan, IPlanDay, IPlanRequest, IReading } from './interfaces/IPlan';
import { checkScriptureRangeValidBSB } from './utilities/checkScriptureExistsBSB';
import { ensureBookShortName } from './components/bible/utilities';
import { fakeStream } from './utilities/fakeStream';
import Plan from './components/Plan';
import PlanCollaborationModal from './start-plan-with-others';
import { useState } from 'preact/hooks';

const planContainer = document.getElementById('plan-container');

interface IPlanActionsProps {
  plan: IPlan;
  cover: string;
  completed: boolean;
  generating: boolean;
  isValidating: boolean;
  isValid: boolean;
}

function PlanActions(props: IPlanActionsProps) {
  const [showModal, setShowModal] = useState(false);

  if (props.generating) {
    return (
      <div className="d-flex">
        <div className="spinner-border text-primary" role="status">
        </div>
        <div className="ms-2">Generating...</div>
      </div>
    );
  }
  if (props.isValidating) {
    return (
      <div className="d-flex">
        <div className="spinner-border text-primary" role="status">
        </div>
        <div className="ms-2">Validating...</div>
      </div>
    );
  }
  if (!props.isValid) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Invalid Plan</h4>
        <p>The AI generated a plan with scriptures we could not find. Please try a different prompt.</p>
      </div>
    )
  }

  const onSubmit = (action: string, selectedStartDate?: string) => {
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

  const handleCollaborationSubmit = (usernames: string[], selectedStartDate: string) => {
    const collaboratorsField = document.getElementById('plan-collaborators') as HTMLInputElement;
    collaboratorsField.value = JSON.stringify(usernames);
    if (selectedStartDate) {
      const startDateField = document.getElementById('plan-start-date') as HTMLInputElement;
      startDateField.value = selectedStartDate;
    }
    setShowModal(false);
    onSubmit('start_together', selectedStartDate);
  };

  return (
    <div>
      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={() => onSubmit('start')} disabled={!props.completed}>Start Myself</button>
        <button className="btn btn-secondary" onClick={() => setShowModal(true)} disabled={!props.completed}>Start Together</button>
        <button className="btn btn-info" onClick={() => onSubmit('default')} disabled={!props.completed}>Save Plan</button>
      </div>

      {showModal && (
        <PlanCollaborationModal
          planId=""
          planName={props.plan.title}
          onClose={() => setShowModal(false)}
          onSubmit={(formData) => {
            const usernames = formData.getAll('usernames[]') as string[];
            const selectedStartDate = formData.get('current_date') as string;
            handleCollaborationSubmit(usernames, selectedStartDate);
            return false; // Prevent default form submission
          }}
        />
      )}
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
  private planActionsRef: RefObject<HTMLDivElement>;

  constructor(props) {
    super(props);
    this.state = {
      plan: null,
      planCover: '',
      isGenerating: false,
      isValid: false,
      isValidating: false,
      generationCompleted: false
    };
    this.planActionsRef = createRef<HTMLDivElement>();
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

    // Handle streaming response
    if (response.ok) {
      let stream = events(response);
      let completion = '';

      for await (let event of stream) {
        if (event.data === '[DONE]') {
          break;
        }

        const pieceOfData = JSON.parse(event.data);
        if (Array.isArray(pieceOfData)) {
          // Handle array format (cached response)
          pieceOfData.forEach(chunk => {
            completion += chunk.choices?.[0]?.delta?.content || '';
          });
        } else {
          // Handle streaming chunks
          completion += pieceOfData.choices?.[0]?.delta?.content || '';
        }
      }

      // Parse the final accumulated content as JSON
      const newDay = JSON.parse(completion);

      newDay.readings.forEach(newReading => {
        const bookId: string = ensureBookShortName(newReading.book);
        if (!checkScriptureRangeValidBSB(bookId, newReading.chapter, newReading.verse_range)) {
          throw new Error('Invalid reading: ' + newReading.book + ' ' + newReading.chapter + ':' + newReading.verse_range);
        }
      });

      this.setState({
        plan: {
          ...this.state.plan,
          days: this.state.plan.days.map(day => day.day_number === newDay.day_number ? newDay : day)
        }
      });
    } else {
      throw new Error('Failed to fix reading');
    }
  }

  render() {
    return (
      <Fragment>
        <PlanForm allowSubmit={!this.state.isGenerating} onSubmit={this.onSubmit} />
        <div class="my-4">
          { this.state.isGenerating && !this.state.plan ? (
            <section className="border border-primary rounded bg-body p-4" style={{ minHeight: '200px'}}></section>
          ) : (
            <Plan plan={this.state.plan} />
          )}
        </div>
        <div ref={this.planActionsRef}>
          { (this.state.isGenerating || this.state.generationCompleted) &&
            <PlanActions
              cover={this.state.planCover}
              plan={this.state.plan}
              isValidating={this.state.isValidating}
              isValid={this.state.isValid}
              generating={this.state.isGenerating}
              completed={this.state.generationCompleted}
            /> }
        </div>
      </Fragment>
    );
  }

  onSubmit = (request: IPlanRequest) => {
    this.setState({ isGenerating: true, planCover: request.cover }, () => {
      setTimeout(() => {
        this.planActionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 500);
    });
    fetch('/api/generate_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
      },
      body: JSON.stringify({ topic: request.topic, length: request.length, verseAmount: request.verseAmount })
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
