import { h, render } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import ReactBible from './components/bible/ReactBible';
import DayOverview from './components/DayOverview';
import Collapse from 'react-bootstrap/Collapse';

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

interface IPlanUserReading {
  day_number: number;
  reading_index: number;
  completed: boolean;
}

interface IPlanInstanceUser {
  id: number;
  plan_instance_id: number;
  user_id: number;
  completed: boolean;
  creator: boolean;
  removed: boolean;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

interface IWindow extends Window {
  planData: IPlan;
  planInstanceData: IPlanInstance;
  planInstanceUser: IPlanInstanceUser;
  planReadingData: IPlanUserReading[];
}

declare let window: IWindow;

interface IPlanReadingProps {
  reading: IPlanReading | 'overview';
  isReadingCompleted?: boolean;
  onClick: () => void;
  onCheckboxChange: (isChecked: boolean) => void;
}

function PlanReading({ reading, isReadingCompleted, onCheckboxChange, onClick }: IPlanReadingProps) {
  return (
    <li className={`list-group-item d-flex justify-content-between align-items-center ${isReadingCompleted ? 'list-group-item-success' : ''}`} onClick={(event: MouseEvent) => {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      onClick();
    }}>
      { reading === 'overview' ? 'Overview' : `${reading.book} ${reading.chapter}${reading.verse_range ? ':' : ''}${reading.verse_range}` }
      <input type="checkbox" class="form-check-input" checked={isReadingCompleted} onChange={(event: Event) => onCheckboxChange((event.target as HTMLInputElement).checked)} />
    </li>
  );
}

interface IPlanDayProps {
  day: IPlanDay;
  startDate: string;
  onReadingClick: (reading: IPlanReading) => void;
  onOverviewClick: () => void;
  getReadingCompleted: (dayNumber: number, readingIndex: number) => boolean;
  onChangeCompletion: (isChecked: boolean, dayNumber: number, readingIndex: number) => void;
  getDayCompleted: (dayNumber: number) => boolean;
}

function PlanDay({ day, startDate, onReadingClick, onOverviewClick, getReadingCompleted, getDayCompleted, onChangeCompletion }: IPlanDayProps) {
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + day.day_number - 1);
  const today = new Date();
  const isToday = dayDate.toDateString() === today.toDateString();
  const badgeClass = isToday ? 'bg-primary' : 'bg-light border border-primary';
  const isCompleted = getDayCompleted(day.day_number);

  return (
    <div className={`card mb-3 ${isCompleted ? 'bg-success text-white' : ''}`}>
      <div className="card-header">
        Day {day.day_number}: {day.outline}
        <span className={`badge ${badgeClass} ms-2`}>{dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <ul className="list-group list-group-flush">
        <PlanReading
          reading='overview'
          isReadingCompleted={getReadingCompleted(day.day_number, 0)}
          key={0}
          onClick={onOverviewClick}
          onCheckboxChange={(isChecked: boolean) => onChangeCompletion(isChecked, day.day_number, 0)}
        />
        {day.readings.map((reading, index) => (
          <PlanReading
          reading={reading}
          isReadingCompleted={getReadingCompleted(day.day_number, index + 1)}
          key={index + 1}
          onClick={() => onReadingClick(reading)}
          onCheckboxChange={(isChecked: boolean) => onChangeCompletion(isChecked, day.day_number, index + 1)}
        />
        ))}
      </ul>
    </div>
  );
}

interface IPlanSidebarProps {
  plan: IPlan;
  startDate: string;
  onReadingClick: (reading: IPlanReading) => void;
  onOverviewClick: (day: IPlanDay) => void;
  getReadingCompleted: (dayNumber: number, readingIndex: number) => boolean;
  getDayCompleted: (dayNumber: number) => boolean;
  onChangeCompletion: (isChecked: boolean, dayNumber: number, readingIndex: number) => void;
}

function PlanSidebar({
  plan,
  startDate,
  onReadingClick,
  onOverviewClick,
  getReadingCompleted,
  getDayCompleted,
  onChangeCompletion
}: IPlanSidebarProps) {
  const completedDays = useMemo<IPlanDay[]>(() => {
    return plan.days.filter(day => getDayCompleted(day.day_number));
  }, []);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div>
      {completedDays.length > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          aria-controls="completedDaysCollapse"
          aria-expanded={showCompleted}
          className="btn btn-outline-info mb-3"
        >
          {showCompleted ? 'Hide Completed Days' : 'Show Completed Days'}
        </button>
      )}
      <Collapse in={showCompleted}>
        <div id="completedDaysCollapse">
          {completedDays.map(day => (
            <PlanDay
              day={day}
              key={day.day_number}
              startDate={startDate}
              onReadingClick={onReadingClick}
              onOverviewClick={() => onOverviewClick(day)}
              getReadingCompleted={getReadingCompleted}
              getDayCompleted={getDayCompleted}
              onChangeCompletion={onChangeCompletion}
            />
          ))}
        </div>
      </Collapse>
      {plan.days.filter(day => !completedDays.includes(day)).map(day => (
        <PlanDay
          day={day}
          key={day.day_number}
          startDate={startDate}
          onReadingClick={onReadingClick}
          onOverviewClick={() => onOverviewClick(day)}
          getReadingCompleted={getReadingCompleted}
          getDayCompleted={getDayCompleted}
          onChangeCompletion={onChangeCompletion}
        />
      ))}
    </div>
  );
}

interface IPlanInstanceProps {
  plan: IPlan;
  planInstance: IPlanInstance;
  planReadingData: IPlanUserReading[];
  planInstanceUser: IPlanInstanceUser;
}

interface IPlanReadingMap {
  [day: number]: {
    [reading: number]: boolean;
  };
}

function PlanInstance({ plan, planInstance, planReadingData, planInstanceUser }: IPlanInstanceProps) {
  const [selectedReading, setSelectedReading] = useState<IPlanReading | null>(null);
  const [selectedDay, setSelectedDay] = useState<IPlanDay | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isReadingCompleted, setIsReadingCompleted] = useState(planInstanceUser.completed);
  const [planReadingMap, setPlanReadingMap] = useState<IPlanReadingMap>(() => {
    const map: IPlanReadingMap = {};
    planReadingData.forEach(reading => {
      if (!map[reading.day_number]) {
        map[reading.day_number] = {};
      }
      map[reading.day_number][reading.reading_index] = reading.completed;
    });
    return map;
  });

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

  const getReadingCompleted = (dayNumber: number, readingIndex: number) => {
    return planReadingMap[dayNumber]?.[readingIndex] ?? false;
  };

  const getDayCompleted = (dayNumber: number) => {
    const day = plan.days.find(day => day.day_number === dayNumber);
    if (!day) {
      return false;
    }
    if (day.readings.length === 0) {
      return true;
    }
    return getReadingCompleted(dayNumber, 0) && day.readings.every((reading, index) => getReadingCompleted(dayNumber, index + 1));
  }

  const onChangeCompletion = useCallback(async (isChecked: boolean, dayNumber: number, readingIndex: number) => {
    setPlanReadingMap(prevMap => {
      const newMap = { ...prevMap };
      if (!newMap[dayNumber]) {
        newMap[dayNumber] = {};
      }
      newMap[dayNumber][readingIndex] = isChecked;
      return newMap;
    });
    const response = await fetch(`/plan_instances/${planInstance.id}/update_reading_status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({
        plan_instance_user_id: planInstanceUser.id,
        day_number: dayNumber,
        reading_index: readingIndex,
        completed: isChecked
      })
    });
    if (!response.ok) {
      alert('Unable to update reading completion status');
    }
    // if all readings are completed, mark the plan_user_instance as completed
    const allReadingsCompleted = plan.days.every(day => {
      if (day.readings.length === 0) {
        return true;
      }
      return getReadingCompleted(day.day_number, 0) && day.readings.every((reading, index) => getReadingCompleted(day.day_number, index + 1));
    });
    if (isReadingCompleted !== allReadingsCompleted) {
      setIsReadingCompleted(allReadingsCompleted);
      const response = await fetch(`/plan_instances/${planInstance.id}/update_plan_status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
          plan_instance_user_id: planInstanceUser.id,
          completed: allReadingsCompleted
        })
      });
      if (!response.ok) {
        alert('Unable to update plan completion status');
      }
    }
  }, [planInstance.id, planInstanceUser.id, plan.days, getReadingCompleted, isReadingCompleted]);

  return (
    <div>
      <div className="row">
        {isSidebarVisible && (
          <div className="col-12 col-md-3" id="plan-sidebar">
            <PlanSidebar plan={plan} startDate={planInstance.start_date} onReadingClick={showReadingDetails} onOverviewClick={showOverviewDetails} getReadingCompleted={getReadingCompleted} getDayCompleted={getDayCompleted} onChangeCompletion={onChangeCompletion} />
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
              <DayOverview day={selectedDay.day_number} planInstance={planInstance} />
            </div>
          ) : (
            <div>Select a reading or overview to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}

const planData = window.planData;
const planInstanceData = window.planInstanceData;
const planInstanceUser = window.planInstanceUser;
const planReadingData = window.planReadingData;
render(<PlanInstance plan={planData} planInstance={planInstanceData} planReadingData={planReadingData} planInstanceUser={planInstanceUser} />, document.getElementById('plan-instance-root'));
