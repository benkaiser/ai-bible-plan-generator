import { h, render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

interface TraditionalPlanModalProps {
  planId: string;
  planName: string;
  days: { dayNumber: number; dayInfo: string }[];
  onClose: () => void;
  onSubmit: (formData: FormData) => boolean | void;
}

// Main modal component
const TraditionalPlanModal = ({ planId, planName, days, onClose, onSubmit }: TraditionalPlanModalProps) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSliderChange = (event: Event) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    setSelectedDay(value);
  };

  const handleDateChange = (e: Event) => {
    setStartDate((e.target as HTMLInputElement).value);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!formRef.current) return;

    if (formRef.current.checkValidity()) {
      const formData = new FormData(formRef.current);
      formData.set('plan_id', planId);
      formData.set('current_date', startDate);
      formData.set('start_day', selectedDay.toString());

      const result = onSubmit(formData);
      if (result !== false) {
        formRef.current.classList.add('was-validated');
      }
    } else {
      formRef.current.classList.add('was-validated');
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Start or Continue {planName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form ref={formRef} onSubmit={handleSubmit} noValidate className="needs-validation">
          <input type="hidden" name="plan_id" value={planId} />

          <Form.Group className="mb-3">
            <p>Plan: <strong>{planName}</strong></p>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              name="current_date"
              value={startDate}
              onChange={handleDateChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please select a valid date (today or in the future).
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="day-slider">Select Starting Day</Form.Label>
            <Form.Control
              type="range"
              name="start_day"
              id="day-slider"
              min="1"
              max={days.length}
              value={selectedDay}
              onInput={handleSliderChange}
              required
            />
            <p className="mt-2" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">Day {selectedDay}: {days[selectedDay - 1]?.dayInfo}</p>
          </Form.Group>

          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Start Plan
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

// Main container component that will be rendered on the page
const StartTraditionalPlanContainer = () => {
  const [modalProps, setModalProps] = useState<{
    show: boolean;
    planId: string;
    planName: string;
    days: { dayNumber: number; dayInfo: string }[];
  }>({
    show: false,
    planId: '',
    planName: '',
    days: []
  });

  useEffect(() => {
    document.querySelectorAll('[data-action="start-traditional-plan"]').forEach(btn => {
      btn.addEventListener('click', function (this: HTMLElement, e) {
        e.preventDefault();

        const planId = this.getAttribute('data-plan-id') || '';
        const planName = this.closest('.card')?.querySelector('.card-title')?.textContent || 'Plan';

        fetch(`/plans/${planId}/days`)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch plan days');
            return response.json();
          })
          .then(days => {
            setModalProps({
              show: true,
              planId,
              planName,
              days: days.map((day: any) => ({
                dayNumber: day.dayNumber,
                dayInfo: day.readings.map((reading: any) => {
                  const verseRange = reading.verseRange ? `:${reading.verseRange}` : '';
                  return `${reading.book} ${reading.chapter}${verseRange}`;
                }).join(', ')
              }))
            });
          })
          .catch(error => console.error(error));
      });
    });
  }, []);

  const handleClose = () => {
    setModalProps({ ...modalProps, show: false });
  };

  const handleSubmit = (formData: FormData) => {
    // Call the specific endpoint for traditional plans
    fetch('/start_traditional_plan', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')!.getAttribute('content') as string
      }
    }).then(response => {
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        return response.json();
      }
    }).then(data => {
      if (data && data.redirect_to) {
        window.location.href = data.redirect_to;
      }
    }).catch(error => {
      console.error('Error creating traditional plan:', error);
    });

    handleClose();
    return true;
  };

  return modalProps.show ? (
    <TraditionalPlanModal
      planId={modalProps.planId}
      planName={modalProps.planName}
      days={modalProps.days}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  ) : null;
};

// Initialize the component when DOM is loaded
const initApp = () => {
  const container = document.getElementById('start-traditional-plan-container');
  if (container) {
    render(<StartTraditionalPlanContainer />, container);
  }
};

document.addEventListener('turbo:load', initApp);
