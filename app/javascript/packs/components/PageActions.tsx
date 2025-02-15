import { h } from 'preact';
import { planActions } from './PageActions.module.css';

interface PageActionsProps {
  onNext: () => void;
  onPrevious: () => void;
  showNext: boolean;
  showPrevious: boolean;
}

const PageActions: React.FC<PageActionsProps> = ({ onNext, onPrevious, showNext, showPrevious }) => {
  return (
    <div className={planActions}>
      <button className="btn btn-info" disabled={!showPrevious} onClick={onPrevious}>
        <i class="bi bi-caret-left-fill"></i>
      </button>
      <button className="btn btn-info" disabled={!showNext} onClick={onNext}>
        <i class="bi bi-caret-right-fill"></i>
      </button>
    </div>
  );
};

export default PageActions;