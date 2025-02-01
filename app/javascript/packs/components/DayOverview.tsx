// create a class component called DayOverview, that takes in two props, day (a number) and planInstance, then calls /plan_instances/${planInstance.id}/day_overview with a post param of day_number and just dumps the returned JSON into a <div>
import { Component, h } from 'preact';
import Markdown from 'react-markdown'
import { events } from 'fetch-event-stream';

interface IDayOverviewProps {
  day: number;
  planInstance: {id: number};
}

interface IDayOverviewState {
  dayOverview: string;
}

class DayOverview extends Component<IDayOverviewProps, IDayOverviewState> {
  constructor(props) {
    super(props);
    this.state = { dayOverview: '' };
  }

  componentDidMount(): void {
    this.fetchPlan(this.props.day);
  }

  componentWillReceiveProps(nextProps: Readonly<IDayOverviewProps>, nextContext: any): void {
    if (this.props.day !== nextProps.day) {
      this.setState({ dayOverview: '' });
      this.fetchPlan(nextProps.day);
    }
  }

  fetchPlan(day: number) {
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
          completion += pieceOfData.choices[0]?.delta?.content || '';
          this.setState({ dayOverview: completion });
        }
      }
    })
    .catch(error => {
      this.setState({ dayOverview: 'Unable to generate plan overview. Please try again later.' });
      console.error('Error:', error);
    });
  }

  render() {
    return (
      <div>
        <Markdown>{this.state.dayOverview}</Markdown>
      </div>
    );
  }
}

export default DayOverview;