import { h } from 'preact';
import { useState } from 'preact/hooks';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

const NotificationModal = ({ onClose, planInstanceId, show }) => {
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (window as any).PUBLIC_VAPID_KEY
      });

      const { endpoint, keys: { p256dh, auth } } = subscription.toJSON();

      await fetch('/notification_subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ endpoint, p256dh, auth, time, plan_instance_id: planInstanceId })
      });

      onClose();
    } else {
      setError('Notification permissions rejected. Please go into site settings and manually enable notification permissions.');
    }
  };

  const onRemoveAll = async () => {
    await fetch('/notification_subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ plan_instance_id: planInstanceId }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      }
    });
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Notification Time</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger">{error}</div>}
        <input type="time" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} />
      </Modal.Body>
      <Modal.Footer>
        { (window as any).hasNotifications && <Button variant="danger" onClick={onRemoveAll}>
          Remove plan notifications
        </Button> }
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Submit
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NotificationModal;