import { Component, h } from 'preact';
import Markdown from 'react-markdown'
import { events } from 'fetch-event-stream';
import { fakeStream } from '../utilities/fakeStream';
import OverviewAudioControls from './OverviewAudioControls';

interface IDayOverviewProps {
  day: number;
  planInstance: {id: number};
  outline?: string;
}

interface IDayOverviewState {
  dayOverview: string;
  loading: boolean;
  streamCompleted: boolean;
  showAudioPlayer: boolean;
}

class DayOverview extends Component<IDayOverviewProps, IDayOverviewState> {
  constructor(props) {
    super(props);
    this.state = {
      streamCompleted: false,
      dayOverview: '',
      loading: false,
      showAudioPlayer: sessionStorage.getItem('showAudioPlayer') === 'true'
    };
  }

  componentDidMount(): void {
    this.fetchPlan(this.props.day);
  }

  toggleAudioPlayer = () => {
    const newState = !this.state.showAudioPlayer;
    this.setState({ showAudioPlayer: newState });
    sessionStorage.setItem('showAudioPlayer', newState.toString());
  }

  fetchPlan(day: number) {
    this.setState({ loading: true });
    fetch(`/plan_instances/${this.props.planInstance.id}/day_overview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({ day_number: day }),
    })
    .then(async (response) => {
      if (response.ok) {
        let stream = events(response);
        let completion = '';
        for await (let event of stream) {
          if (event.data === '[DONE]') {
            break;
          }
          const pieceOfData = JSON.parse(event.data);
          if (Array.isArray(pieceOfData)) {
            await fakeStream(pieceOfData, (chunk) => {
              completion += chunk;
              this.setState({ dayOverview: completion, loading: false });
            }, 20, 60);
          } else {
            completion += pieceOfData.choices[0]?.delta?.content || '';
            this.setState({ dayOverview: completion, loading: false });
          }
        }
      }
      this.setState({ loading: false, streamCompleted: true });
    })
    .catch(error => {
      this.setState({
        dayOverview: 'Unable to generate plan overview. Please refresh the page and try again.',
        loading: false
      });
      console.error('Error:', error);
    });
  }

  render() {
    return (
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2>Day {this.props.day}: {this.props.outline || ''}</h2>
          {this.state.streamCompleted && (
            <button
              className="btn btn-outline-primary"
              onClick={this.toggleAudioPlayer}
              title="Toggle audio player"
            >
              <i className="bi bi-volume-up-fill"></i>
            </button>
          )}
        </div>

        {this.state.streamCompleted && this.state.showAudioPlayer && (
          <OverviewAudioControls
            planInstanceId={this.props.planInstance.id}
            dayNumber={this.props.day}
          />
        )}

        {this.state.loading ? (
          <div className="d-flex justify-content-start my-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <Markdown>{this.state.dayOverview}</Markdown>
        )}
      </div>
    );
  }
}

export default DayOverview;