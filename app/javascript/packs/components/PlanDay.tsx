import { h } from 'preact';
import { IPlanDay } from '../interfaces/IPlan';
import PlanReading from './PlanReading';

export default function PlanDay({ day }: { day: IPlanDay }) {
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