import { h } from 'preact';
import { useState } from 'preact/hooks';
import isMobile from '../utilities/isMobile';
import { IPlanReading } from '../interfaces/IPlanReading';
import { readingControls } from '../plan-instance.module.css';
import { ExternalBibleDialog } from './ExternalBibleDialog';

interface IReadingControlsProps {
  isLastReadingForDay: boolean;
  selectedReading?: IPlanReading;
  onNext: () => void;
  onPrevious?: () => void;
}

export function ReadingControls({ isLastReadingForDay, selectedReading, onNext, onPrevious }: IReadingControlsProps) {
  const [showExternalDialog, setShowExternalDialog] = useState(false);

  const openExternallyDialog = (e: MouseEvent) => {
    e.stopPropagation();
    setShowExternalDialog(true);
  };

  return (
    <div className={`d-flex justify-content-between ${isMobile() ? readingControls : 'my-3'}`}>
      <button className={`btn btn-secondary ${!onPrevious ? 'invisible' : ''}`} type="button" onClick={onPrevious}>
        <i className="bi bi-arrow-left me-1"></i>
        Previous
      </button>
      { selectedReading  && <button className="btn btn-info" type="button" onClick={openExternallyDialog}>
        <i className="bi bi-book me-1"></i> Open
      </button> }
      <button className="btn btn-primary" type="button" onClick={onNext}>
        <i className={`bi ${isLastReadingForDay ? 'bi-check2' : 'bi-arrow-right'} me-1`}></i>
        { isLastReadingForDay ? 'Done' : 'Next' }
      </button>

      {selectedReading && (
        <ExternalBibleDialog
          show={showExternalDialog}
          onHide={() => setShowExternalDialog(false)}
          reading={selectedReading}
        />
      )}
    </div>
  );
}