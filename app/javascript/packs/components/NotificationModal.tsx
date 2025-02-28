import { h } from 'preact';
import { useState } from 'preact/hooks';

const NotificationModal = ({ onClose, planInstanceId }) => {
  const [time, setTime] = useState('');

  const handleSubmit = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (window as any).PUBLIC_VAPID_KEY
      });

      await fetch('/notification_subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ subscription, time, plan_instance_id: planInstanceId })
      });

      onClose();
    }
  };

  return (
    <div className="modal">
      <h2>Select Notification Time</h2>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default NotificationModal;