import { h } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';
import { IPlanRequest } from '../interfaces/IPlan';
import TopicInput from './TopicInput';
import { imageLoadContainer } from './PlanForm.module.css';

interface IPlanFormProps {
  allowSubmit: boolean;
  onSubmit: (planRequest: IPlanRequest) => void;
}

const PlanForm = (props: IPlanFormProps) => {
  const [length, setLength] = useState(7);
  const [customLength, setCustomLength] = useState(7);
  const [showCustomLength, setShowCustomLength] = useState(false);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 100000));
  const [loading, setLoading] = useState(true);

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

  const regeneratePhoto = () => {
    setSeed(Math.floor(Math.random() * 100000));
    setLoading(true);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const onSubmit = useCallback((event: Event) => {
    event.preventDefault();
    const topic = topicInputRef.current.value;
    const planLength = showCustomLength ? customLength : length;
    props.onSubmit({ topic, length: planLength, cover: `https://picsum.photos/seed/${seed}` });
  }, [props, showCustomLength, customLength, length]);

  return (
    <form id="plan-form me-2" onSubmit={onSubmit}>
      <div className="row">
        <div className="col-md-6 mb-2 mb-md-0">
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
        </div>
        <div className="col-md-6">
          <label>Cover Image</label>
          <div className="cover-photo">
            <div>
              {loading && (
                <div class={`${imageLoadContainer} img-thumbnail`}>
                  <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              <img
                className="img-thumbnail"
                src={`https://picsum.photos/seed/${seed}/400/200`}
                alt="Cover"
                onLoad={handleImageLoad}
                style={{ display: loading ? 'none' : 'block' }}
              />
            </div>
            <button type="button" className="btn btn-info mt-2" onClick={regeneratePhoto}>
              <i class="bi bi-dice-5 me-2"></i>
              New Image
            </button>
            </div>
        </div>
      </div>
      <button type="button" className="btn btn-primary my-2" id="generate-plan" onClick={onSubmit} disabled={!props.allowSubmit}>
          Generate Plan
        </button>
    </form>
  );
};

export default PlanForm;