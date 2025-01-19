import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import ReactBible from './components/bible/ReactBible';

interface IPlanReading {
  book: string;
  chapter: number;
  verse_range: string;
  why_selected: string;
}

interface IPlanDay {
  day_number: number;
  outline: string;
  readings: IPlanReading[];
}

interface IPlan {
  id: number;
  name: string;
  description: string;
  cover_photo: string;
  days: IPlanDay[];
  created_at: string;
  updated_at: string;
  user_id: number;
}

interface IPlanInstance {
  id: number;
  plan_id: number;
  start_date: string;
  created_at: string;
  updated_at: string;
}

interface IWindow extends Window {
  planData: IPlan;
  planInstanceData: IPlanInstance;
}

declare let window: IWindow;

function PlanReading({ reading, onClick }: { reading: IPlanReading, onClick: () => void }) {
  return (
    <li className="list-group-item d-flex justify-content-between align-items-center" onClick={onClick}>
      <span>{`${reading.book} ${reading.chapter}:${reading.verse_range}`}</span>
    </li>
  );
}

function PlanDay({ day, startDate, onReadingClick, onOverviewClick }: { day: IPlanDay, startDate: string, onReadingClick: (reading: IPlanReading) => void, onOverviewClick: () => void }) {
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + day.day_number - 1);
  const today = new Date();
  const isToday = dayDate.toDateString() === today.toDateString();
  const badgeClass = isToday ? 'bg-primary' : 'bg-secondary';

  return (
    <div className="card mb-3">
      <div className="card-header">
        Day {day.day_number}: {day.outline}
        <span className={`badge ${badgeClass} ms-2`}>{dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <button className="btn btn-link float-end d-md-none" type="button" onClick={onOverviewClick}>
          <i className="bi bi-caret-right"></i>
        </button>
      </div>
      <ul className="list-group list-group-flush">
        <li className="list-group-item d-flex justify-content-between align-items-center" onClick={onOverviewClick}>
          <span>Overview</span>
        </li>
        {day.readings.map((reading, index) => (
          <PlanReading reading={reading} key={index} onClick={() => onReadingClick(reading)} />
        ))}
      </ul>
    </div>
  );
}

function PlanSidebar({ plan, startDate, onReadingClick, onOverviewClick }: { plan: IPlan, startDate: string, onReadingClick: (reading: IPlanReading) => void, onOverviewClick: (day: IPlanDay) => void }) {
  return (
    <div>
      {plan.days.map(day => (
        <PlanDay day={day} key={day.day_number} startDate={startDate} onReadingClick={onReadingClick} onOverviewClick={() => onOverviewClick(day)} />
      ))}
    </div>
  );
}

function PlanInstance({ plan, planInstance }: { plan: IPlan, planInstance: IPlanInstance }) {
  const [selectedReading, setSelectedReading] = useState<IPlanReading | null>(null);
  const [selectedDay, setSelectedDay] = useState<IPlanDay | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  const showReadingDetails = (reading: IPlanReading) => {
    setSelectedReading(reading);
    if (isMobile) {
      setIsSidebarVisible(false);
    }
  };

  const showOverviewDetails = (day: IPlanDay) => {
    setSelectedDay(day);
    setSelectedReading(null);
    if (isMobile) {
      setIsSidebarVisible(false);
    }
  };

  const showSidebar = () => {
    setSelectedReading(null);
    setSelectedDay(null);
    setIsSidebarVisible(true);
  };

  return (
    <div className="container">
      <div className="row">
        {isSidebarVisible && (
          <div className="col-12 col-md-3" id="plan-sidebar">
            <PlanSidebar plan={plan} startDate={planInstance.start_date} onReadingClick={showReadingDetails} onOverviewClick={showOverviewDetails} />
          </div>
        )}
        <div className={`col-12 ${isSidebarVisible ? 'col-md-9' : ''}`} id="right-section">
          {selectedReading ? (
            <div>
              <button className="btn btn-link d-md-none" type="button" onClick={showSidebar}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <h2>{`${selectedReading.book} ${selectedReading.chapter}:${selectedReading.verse_range}`}</h2>
              <ReactBible book={selectedReading.book} chapter={selectedReading.chapter} verseRange={selectedReading.verse_range} />
            </div>
          ) : selectedDay ? (
            <div>
              <button className="btn btn-link d-md-none" type="button" onClick={showSidebar}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <h2>Day {selectedDay.day_number}: {selectedDay.outline}</h2>
              <p>Overview of the day.</p>
            </div>
          ) : (
            <div>Select a reading or overview to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const planData = window.planData;
  const planInstanceData = window.planInstanceData;
  render(<PlanInstance plan={planData} planInstance={planInstanceData} />, document.getElementById('plan-instance-root'));
});