import { h } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';
import { IPlanRequest } from '../interfaces/IPlan';
import TopicInput from './TopicInput';

interface IPlanFormProps {
  allowSubmit: boolean;
  onSubmit: (planRequest: IPlanRequest) => void;
}

const PlanForm = (props: IPlanFormProps) => {
  const [length, setLength] = useState(7);
  const [customLength, setCustomLength] = useState(7);
  const [showCustomLength, setShowCustomLength] = useState(false);
  const topicInputRef = useRef<HTMLInputElement>(null);

  const handleLengthChange = (event) => {
    const value = event.target.value;
    setLength(value);
    setShowCustomLength(value === 'custom');
  };

  const handleCustomLengthInput = (event) => {
    const min = parseInt(event.target.min);
    const max = parseInt(event.target.max);
    const value = parseInt(event.target.value);

    if (value < min) {
      setCustomLength(min);
    } else if (value > max) {
      setCustomLength(max);
    } else {
      setCustomLength(value);
    }
  };

  const onSubmit = useCallback(() => {
    const topic = topicInputRef.current.value;
    const planLength = showCustomLength ? customLength : length;
    props.onSubmit({ topic, length: planLength });
  }, [props, showCustomLength, customLength, length]);

  return (
    <form id="plan-form">
      <div className="form-group mt-2">
        <label htmlFor="plan-topic">What do you want your bible plan to be about?</label>
        <TopicInput inputRef={topicInputRef} />
      </div>

      <div className="form-group d-flex align-items-center mt-2">
        <div className="me-2">
          <label htmlFor="plan-length">How long do you want the plan to be?</label>
        </div>
        <div className="me-2">
          <select
            id="plan-length"
            className="form-control"
            style={{ width: 'auto' }}
            value={length}
            onChange={handleLengthChange}
          >
            <option value={7}>7 days</option>
            <option value={30}>1 month</option>
            <option value={90}>3 months</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {showCustomLength && (
          <div className="input-group" style={{ width: 'auto' }}>
            <input
              type="number"
              id="custom-length"
              className="form-control"
              min={1}
              max={180}
              value={customLength}
              onInput={handleCustomLengthInput}
            />
            <div className="input-group-append">
              <span className="input-group-text">days</span>
            </div>
          </div>
        )}
      </div>

      <button type="button" className="btn btn-primary mt-2" id="generate-plan" onClick={onSubmit} disabled={!props.allowSubmit}>
        Generate Plan
      </button>
    </form>
  );
};

export default PlanForm;