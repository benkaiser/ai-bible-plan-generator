import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { BibleProvider, getExternalBibleLink, getStoredBibleProvider, setStoredBibleProvider } from '../utilities/bibleLinks';
import { IPlanReading } from '../interfaces/IPlanReading';

interface ExternalBibleDialogProps {
  show: boolean;
  onHide: () => void;
  reading: IPlanReading;
}

export function ExternalBibleDialog({ show, onHide, reading }: ExternalBibleDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<BibleProvider>(BibleProvider.YouVersion);

  useEffect(() => {
    if (show) {
      setSelectedProvider(getStoredBibleProvider());
    }
  }, [show]);

  const handleProviderChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as BibleProvider;
    setSelectedProvider(value);
    setStoredBibleProvider(value);
  };

  const handleOpen = () => {
    const url = getExternalBibleLink(selectedProvider, reading);
    window.open(url, '_blank');
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Open in External Bible App</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Choose where to open{' '}
          <strong>
            {reading.book} {reading.chapter}
            {reading.verse_range ? ':' + reading.verse_range : ''}
          </strong>
        </p>

        <div className="form-group">
          <label htmlFor="bibleProviderSelect">Bible Provider</label>
          <select
            className="form-control"
            id="bibleProviderSelect"
            value={selectedProvider}
            onChange={handleProviderChange}
          >
            <option value={BibleProvider.YouVersion}>YouVersion / Bible.com</option>
            <option value={BibleProvider.BibleGateway}>Bible Gateway</option>
            <option value={BibleProvider.BibleHub}>Bible Hub</option>
          </select>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleOpen}>
          Open
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
