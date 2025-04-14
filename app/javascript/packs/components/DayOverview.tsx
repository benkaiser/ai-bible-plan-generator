// create a class component called DayOverview, that takes in two props, day (a number) and planInstance, then calls /plan_instances/${planInstance.id}/day_overview with a post param of day_number and just dumps the returned JSON into a <div>
import { Component, h } from 'preact';
import Markdown from 'react-markdown'
import { events } from 'fetch-event-stream';
import { fakeStream } from '../utilities/fakeStream';

interface IDayOverviewProps {
  day: number;
  planInstance: {id: number};
}

interface IDayOverviewState {
  dayOverview: string;
  loading: boolean;
}

class DayOverview extends Component<IDayOverviewProps, IDayOverviewState> {
  constructor(props) {
    super(props);
    this.state = {
      dayOverview: '',
      loading: false
    };
  }

  componentDidMount(): void {
    this.fetchPlan(this.props.day);
  }

  componentWillReceiveProps(nextProps: Readonly<IDayOverviewProps>, nextContext: any): void {
    if (this.props.day !== nextProps.day) {
      this.setState({ dayOverview: '', loading: false });
      this.fetchPlan(nextProps.day);
    }
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
            fakeStream(pieceOfData, (chunk) => {
              completion += chunk;
              this.setState({ dayOverview: completion, loading: false });
            }, 20, 60);
          } else {
            completion += pieceOfData.choices[0]?.delta?.content || '';
            this.setState({ dayOverview: completion, loading: false });
          }
        }
      }
      this.setState({ loading: false });
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