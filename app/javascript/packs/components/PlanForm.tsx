import { h } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';
import { IPlanRequest } from '../interfaces/IPlan';
import TopicInput from './TopicInput';
import { imageLoadContainer } from './PlanForm.module.css';
import TopicIdeas from './TopicIdeas';

interface IPlanFormProps {
  allowSubmit: boolean;
  onSubmit: (planRequest: IPlanRequest) => void;
}

const PlanForm = (props: IPlanFormProps) => {
  const [length, setLength] = useState(7);
  const [verseAmount, setVerseAmount] = useState(2);
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

  const handleVerseAmountChange = (event) => {
    setVerseAmount(event.target.value);
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

  const onSubmit = useCallback((event?: Event) => {
    event?.preventDefault();
    const topic = topicInputRef.current.value;
    const planLength = showCustomLength ? customLength : length;
    props.onSubmit({ topic, length: planLength, verseAmount, cover: `https://picsum.photos/seed/${seed}` });
  }, [props, showCustomLength, customLength, length, verseAmount]);

  const onChangeTopic = useCallback((topic: string) => {
    topicInputRef.current.value = topic;
    onSubmit();
  }, [onSubmit]);

  return (
    <form id="plan-form me-2" onSubmit={onSubmit}>
      <div className="row">
        <div className="col-md-6 mb-2 mb-md-0">
          <div className="form-group mt-2">
            <label htmlFor="plan-length">Create a</label>
            <select
              id="plan-length"
              className="form-control d-inline-block mx-2"
              style={{ width: 'auto' }}
              value={length}
              onChange={handleLengthChange}
            >
              <option value={7}>7 day</option>
              <option value={30}>1 month</option>
              <option value={90}>3 month</option>
              <option value="custom">Custom Length</option>
            </select>
            {showCustomLength && (
              <div className="input-group d-inline-block mx-2" style={{ width: 'fit-content' }}>
                <input
                  type="number"
                  id="custom-length"
                  style='min-width: 70px'
                  className="form-control d-inline-block"
                  min={1}
                  max={90}
                  value={customLength}
                  onInput={handleCustomLengthInput}
                />
                <div className="input-group-append d-inline-block">
                  <span className="input-group-text">day</span>
                </div>
              </div>
            )}
            <label htmlFor="plan-topic">Bible reading plan about</label>
            <TopicInput inputRef={topicInputRef} />
            <div>
              <label htmlFor="verse-amount">Including</label>
              <select
                id="verse-amount"
                className="form-control d-inline-block mx-2"
                style={{ width: 'auto' }}
                value={verseAmount}
                onChange={handleVerseAmountChange}
              >
                <option value={1}>1 scripture</option>
                <option value={2}>2 scriptures</option>
                <option value={3}>3 scriptures</option>
                <option value={4}>4 scriptures</option>
                <option value={5}>5 scriptures</option>
              </select>
              <span>per day</span>
            </div>
            <button type="button" className="btn btn-primary my-2" id="generate-plan" onClick={onSubmit} disabled={!props.allowSubmit}>
              Generate Plan
            </button>
            <div><label>Topic Ideas</label></div>
            <TopicIdeas onChangePrompt={onChangeTopic} />
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
    </form>
  );
};

export default PlanForm;