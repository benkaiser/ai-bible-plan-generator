import { createContext, h, render } from 'preact';
import { HashRouter as Router, Routes, Route, useParams, useNavigate, RouteProps } from 'react-router-dom';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import ReactBible from './components/bible/ReactBible';
import DayOverview from './components/DayOverview';
import Collapse from 'react-bootstrap/Collapse';
import { readingControls, rightSectionMobile, dayOverviewContainer } from './plan-instance.module.css';
import isMobile from './utilities/isMobile';
import NotificationModal from './components/NotificationModal';

const PlanContext = createContext<{
  plan: IPlan;
  planInstance: IPlanInstance;
  planInstanceUser: IPlanInstanceUser;
  planReadingData: IPlanUserReading[];
}>(null);

const ControlContext = createContext<{
  onNext: (currentDayIndex: number, currentReadingIndex: number) => void;
  onPrevious: (currentDayIndex: number, currentReadingIndex: number) => void;
  getReadingCompleted: (dayNumber: number, readingIndex: number) => boolean;
  getDayCompleted: (dayNumber: number) => boolean;
  onChangeCompletion: (isChecked: boolean, dayNumber: number, readingIndex: number) => void;
}>(null);

interface IPlanReading {
  book: string;
  chapter: number;
  verse_range?: string;
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
      { reading === 'overview' ? 'Overview' : `${reading.book} ${reading.chapter}${reading.verse_range ? ':' + reading.verse_range : ''}` }
      <input type="checkbox" class="form-check-input" checked={isReadingCompleted} onChange={(event: Event) => onCheckboxChange((event.target as HTMLInputElement).checked)} />
    </li>
  );
}

interface IPlanDayProps {
  day: IPlanDay;
  dayIndex: number;
  startDate: string;
  onReadingClick: (dayIndex: number, readingIndex?: number) => void;
  getReadingCompleted: (dayNumber: number, readingIndex: number) => boolean;
  onChangeCompletion: (isChecked: boolean, dayNumber: number, readingIndex: number) => void;
  getDayCompleted: (dayNumber: number) => boolean;
}

function PlanDay({ day, dayIndex, startDate, onReadingClick, getReadingCompleted, getDayCompleted, onChangeCompletion }: IPlanDayProps) {
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + dayIndex);
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
          onClick={() => onReadingClick(dayIndex)}
          onCheckboxChange={(isChecked: boolean) => onChangeCompletion(isChecked, day.day_number, 0)}
        />
        {day.readings.map((reading, index) => (
          <PlanReading
          reading={reading}
          isReadingCompleted={getReadingCompleted(day.day_number, index + 1)}
          key={index + 1}
          onClick={() => onReadingClick(dayIndex, index + 1)}
          onCheckboxChange={(isChecked: boolean) => onChangeCompletion(isChecked, day.day_number, index + 1)}
        />
        ))}
      </ul>
    </div>
  );
}

interface IPlanSidebarProps {
  plan: IPlan;
  planInstance: IPlanInstance;
  startDate: string;
  onReadingClick: (dayIndex: number, readingIndex?: number) => void;
  getReadingCompleted: (dayNumber: number, readingIndex: number) => boolean;
  getDayCompleted: (dayNumber: number) => boolean;
  onChangeCompletion: (isChecked: boolean, dayNumber: number, readingIndex: number) => void;
}

function PlanSidebar({
  plan,
  planInstance,
  startDate,
  onReadingClick,
  getReadingCompleted,
  getDayCompleted,
  onChangeCompletion
}: IPlanSidebarProps) {
  const completedDays = useMemo<IPlanDay[]>(() => {
    return plan.days.filter(day => getDayCompleted(day.day_number));
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(() => completedDays.length === plan.days.length);

  const handleNotificationClick = () => {
    setShowModal(true);
  };

  return (
    <div>
      <div className="mb-3 d-flex gap-3 justify-content-between">
        {completedDays.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            aria-controls="completedDaysCollapse"
            aria-expanded={showCompleted}
            className="btn btn-outline-info"
          >
            {showCompleted ? 'Hide Completed Days' : 'Show Completed Days'}
          </button>
        )}
        <button class="btn btn-outline-info" onClick={handleNotificationClick}><i class="bi bi-bell-fill"></i></button>
      </div>
      <NotificationModal planInstanceId={planInstance.id} onClose={() => setShowModal(false)} show={showModal} />

      <Collapse in={showCompleted}>
        <div id="completedDaysCollapse">
          {completedDays.map(day => (
            <PlanDay
              day={day}
              dayIndex={plan.days.indexOf(day)}
              key={day.day_number}
              startDate={startDate}
              onReadingClick={onReadingClick}
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
          dayIndex={plan.days.indexOf(day)}
          key={day.day_number}
          startDate={startDate}
          onReadingClick={onReadingClick}
          getReadingCompleted={getReadingCompleted}
          getDayCompleted={getDayCompleted}
          onChangeCompletion={onChangeCompletion}
        />
      ))}
    </div>
  );
}

interface IReadingControlsProps {
  isLastReadingForDay: boolean;
  onNext: () => void;
  onPrevious?: () => void;
}

function ReadingControls({ isLastReadingForDay, onNext, onPrevious }: IReadingControlsProps) {
  return (
    <div className={`d-flex justify-content-between ${isMobile() ? readingControls : 'my-3'}`}>
      <button className={`btn btn-secondary ${!onPrevious ? 'invisible' : ''}`} type="button" onClick={onPrevious}>
        <i className="bi bi-arrow-left me-1"></i>
        Previous reading
      </button>
      <button className="btn btn-primary" type="button" onClick={onNext}>
        <i className={`bi ${isLastReadingForDay ? 'bi-check2' : 'bi-arrow-right'} me-1`}></i>
        { isLastReadingForDay ? 'Done' : 'Next reading' }
      </button>
    </div>
  );
}

interface IPlanInstanceProps {}

interface IPlanReadingMap {
  [day: number]: {
    [reading: number]: boolean;
  };
}

function PlanInstance({}: IPlanInstanceProps) {
  const { plan, planInstance, planReadingData, planInstanceUser } = useContext(PlanContext);
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
  const navigate = useNavigate();

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
      if (allReadingsCompleted) {
        window.location.href = '/plans?completed=true';
      }
    }
  }, [planInstance.id, planInstanceUser.id, plan.days, getReadingCompleted, isReadingCompleted]);

  const onNextReading = useCallback((dayIndex: number, readingIndex: number) => {
    const day = plan.days[dayIndex];
    onChangeCompletion(true, day.day_number, readingIndex);
    if (readingIndex < day.readings.length) {
      navigate(`/day/${dayIndex}/reading/${readingIndex + 1}`);
    } else {
      navigate('/');
    }
    // TODO: if it's the last day, move the user back to the plan index page
  }, [plan.days, onChangeCompletion]);

  const onPreviousReading = useCallback((currentDayIndex: number, currentReadingIndex: number) => {
    if (currentReadingIndex > 0) {
      navigate(`/day/${currentDayIndex}/reading/${currentReadingIndex - 1}`);
    }
    // only rendered on readings and not on overview, so no need to move to the previous day
  }, [plan.days, onChangeCompletion]);

  return (
    <ControlContext.Provider value={{ onNext: onNextReading, onPrevious: onPreviousReading, getReadingCompleted, getDayCompleted, onChangeCompletion }}>
      <Routes><Route path="*" Component={PlanOverviewOnMobile} /></Routes>
      <h1>{plan.name}</h1>
      <div className="row">
        <Routes>
          <Route path="*" Component={SideBarRoute} />
        </Routes>
        <div className={`col-12 ${isMobile() ? rightSectionMobile : 'col-md-9'}`} id="right-section">
          <Routes>
            <Route path="/day/:dayIndex/reading/0" Component={DayOverviewRoute} />
            <Route path="/day/:dayIndex/reading/:readingIndex" Component={ReadingDetailsRoute} />
            <Route path="/" element={
              ( !isMobile() && (
              <div>
                <div className="alert alert-info">No reading selected. Please select one from the sidebar.</div>
              </div>
              ) )
            } />
          </Routes>
        </div>
      </div>
    </ControlContext.Provider>
  );
}

function PlanOverviewOnMobile(_: RouteProps) {
  const params = useParams();
  const navigate = useNavigate();
  if (!params['*']) {
    return null;
  }
  // render a small bootstrap button saying "Back to overview" only on mobile
  return (
    <a onClick={() => navigate('/')} className="btn btn-outline-info d-block mb-2 btn-sm d-md-none">Back to overview</a>
  );
}

function SideBarRoute(_: RouteProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { plan, planInstance } = useContext(PlanContext);
  const { getReadingCompleted, getDayCompleted, onChangeCompletion } = useContext(ControlContext);
  return (
    <div className={`col-12 col-md-3 ${params['*'] && isMobile() ? 'd-none' : ''}`} id="plan-sidebar">
      <PlanSidebar
        plan={plan}
        planInstance={planInstance}
        startDate={planInstance.start_date}
        onReadingClick={(dayIndex, readingIndex) => navigate(`/day/${dayIndex}/reading/${readingIndex || 0}`)}
        getReadingCompleted={getReadingCompleted}
        getDayCompleted={getDayCompleted}
        onChangeCompletion={onChangeCompletion}
      />
    </div>
  );
}

function ReadingDetailsRoute(_: RouteProps) {
  const { dayIndex, readingIndex } = useParams();
  const { plan } = useContext(PlanContext);
  const day = plan.days[parseInt(dayIndex, 10)];
  const selectedReading = day.readings[parseInt(readingIndex, 10) - 1];
  const { onPrevious, onNext } = useContext(ControlContext);

  return (
    <div>
      <h2>{`${selectedReading.book} ${selectedReading.chapter}${selectedReading.verse_range ? ':' + selectedReading.verse_range : ''}`}</h2>
      <ReactBible isReadingExapandable={true} book={selectedReading.book} chapter={selectedReading.chapter} verseRange={selectedReading.verse_range} />
      <ReadingControls isLastReadingForDay={selectedReading === day?.readings[day.readings.length - 1]}  onPrevious={() => onPrevious(parseInt(dayIndex, 10), parseInt(readingIndex, 10))} onNext={() => onNext(parseInt(dayIndex, 10), parseInt(readingIndex, 10))} />
    </div>
  );
}

function DayOverviewRoute(_: RouteProps) {
  const { dayIndex } = useParams();
  const { plan, planInstance } = useContext(PlanContext);
  const day = plan.days[parseInt(dayIndex, 10)];
  const { onPrevious, onNext } = useContext(ControlContext);

  return (
    <div className={dayOverviewContainer}>
      <h2>Day {day.day_number}: {day.outline}</h2>
      <DayOverview day={day.day_number} planInstance={planInstance} />
      <ReadingControls isLastReadingForDay={day.readings.length === 0} onNext={() => onNext(parseInt(dayIndex, 10), 0)} />
    </div>
  );
}

render((
  <Router>
    <PlanContext.Provider value={{ plan: window.planData, planInstance: window.planInstanceData, planInstanceUser: window.planInstanceUser, planReadingData: window.planReadingData }}>
      <PlanInstance />
    </PlanContext.Provider>
  </Router>
), document.getElementById('plan-instance-root'));
