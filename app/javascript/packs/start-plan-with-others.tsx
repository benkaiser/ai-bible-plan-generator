import { h, render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

interface UserValidationState {
  isChecking: boolean;
  isValid: boolean;
  isInvalid: boolean;
  errorMessage: string;
}

interface PlanCollaborationModalProps {
  planId: string;
  planName: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}

interface AddedUser {
  username: string;
}

interface UserListProps {
  users: AddedUser[];
  onRemove: (index: number) => void;
}

// Component to display the list of added users
const UserList = ({ users, onRemove }: UserListProps) => {
  if (users.length === 0) {
    return <p className="text-muted">No users added yet.</p>;
  }

  return (
    <div className="added-users-list">
      {users.map((user, index) => (
        <div key={index} className="added-user-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
          <span>{user.username}</span>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${user.username}`}
          >
            <i className="bi bi-x"></i>
          </Button>
        </div>
      ))}
    </div>
  );
};

// User input component with validation
const UserInput = ({ onAddUser }: { onAddUser: (username: string) => void }) => {
  const [username, setUsername] = useState<string>('');
  const [validationState, setValidationState] = useState<UserValidationState>({
    isChecking: false,
    isValid: false,
    isInvalid: false,
    errorMessage: ''
  });
  const debounceTimerRef = useRef<number | null>(null);

  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setValidationState({
        isChecking: false,
        isValid: false,
        isInvalid: false,
        errorMessage: ''
      });
      return;
    }

    setValidationState({
      ...validationState,
      isChecking: true,
      isValid: false,
      isInvalid: false
    });

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      fetch('/users/check_username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({ username: value, check_exists: true })
      })
      .then(response => response.json())
      .then(data => {
        const isValid = data.message === "Username is already taken";
        setValidationState({
          isChecking: false,
          isValid: isValid,
          isInvalid: !isValid,
          errorMessage: !isValid ? (data.exists === false ? 'User not found' : data.message || 'Invalid username') : ''
        });
      })
      .catch(error => {
        console.error('Error checking username:', error);
        setValidationState({
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'Error checking username'
        });
      });
    }, 500);
  };

  const handleChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setUsername(value);
    validateUsername(value);
  };

  const handleAddUser = () => {
    if (validationState.isValid && username.trim()) {
      onAddUser(username.trim());
      setUsername('');
      setValidationState({
        isChecking: false,
        isValid: false,
        isInvalid: false,
        errorMessage: ''
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && validationState.isValid) {
      e.preventDefault();
      handleAddUser();
    }
  };

  return (
    <div className="user-input-group mb-3">
      <div className="d-flex align-items-center">
        <div className="position-relative flex-grow-1">
          <Form.Control
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            isValid={validationState.isValid}
            isInvalid={validationState.isInvalid}
            className={validationState.isChecking ? "pe-5" : ""}
          />
          {validationState.isChecking && (
            <div className="position-absolute top-50 end-0 translate-middle-y pe-3">
              <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
            </div>
          )}
        </div>
        <Button
          variant="outline-primary"
          onClick={handleAddUser}
          disabled={!validationState.isValid || validationState.isChecking}
          className="ms-2"
        >
          Add
        </Button>
      </div>
      {validationState.errorMessage && (
        <small className="text-danger">{validationState.errorMessage}</small>
      )}
    </div>
  );
};

// Main modal component
const PlanCollaborationModal = ({ planId, planName, onClose, onSubmit }: PlanCollaborationModalProps) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [addedUsers, setAddedUsers] = useState<AddedUser[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const handleDateChange = (e: Event) => {
    setStartDate((e.target as HTMLInputElement).value);
  };

  const handleAddUser = (username: string) => {
    // Check if user is already in the list
    if (!addedUsers.some(user => user.username === username)) {
      setAddedUsers([...addedUsers, { username }]);
    }
  };

  const handleRemoveUser = (index: number) => {
    const newUsers = [...addedUsers];
    newUsers.splice(index, 1);
    setAddedUsers(newUsers);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!formRef.current) return;

    if (formRef.current.checkValidity() && addedUsers.length > 0) {
      const formData = new FormData(formRef.current);
      formData.set('plan_id', planId);
      formData.set('current_date', startDate);

      // Add all usernames from the added users list
      addedUsers.forEach(user => {
        formData.append('usernames[]', user.username);
      });

      onSubmit(formData);
    } else {
      formRef.current.classList.add('was-validated');
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Start Plan Together</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form ref={formRef} onSubmit={handleSubmit} noValidate className="needs-validation">
          <input type="hidden" name="plan_id" value={planId} />
          <input type="hidden" name="collaborative" value="true" />

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
            <Form.Label>Who would you like to invite to read the plan with you?</Form.Label>
            <UserInput onAddUser={handleAddUser} />

            <div className="mt-3">
              <UserList users={addedUsers} onRemove={handleRemoveUser} />
              {addedUsers.length === 0 && (
                <div className="invalid-feedback" style={{ display: formRef.current?.classList.contains('was-validated') ? 'block' : 'none' }}>
                  Please add at least one user.
                </div>
              )}
            </div>
          </Form.Group>

          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={addedUsers.length === 0}
              title={ addedUsers.length === 0 ? "Please add at least one user" : undefined }
            >
              Start Plan Together
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

// Main container component that will be rendered on the page
const StartPlanWithOthersContainer = () => {
  const [modalProps, setModalProps] = useState<{
    show: boolean;
    planId: string;
    planName: string;
  }>({
    show: false,
    planId: '',
    planName: ''
  });

  useEffect(() => {
    // Configure click handlers for the "Start Plan with Others" links
    document.querySelectorAll('.start-with-others').forEach(btn => {
      btn.addEventListener('click', function(this: HTMLElement, e) {
        e.preventDefault();

        const planId = this.getAttribute('data-plan-id') || '';
        const planName = this.getAttribute('data-plan-name') || '';

        setModalProps({
          show: true,
          planId,
          planName
        });
      });
    });
  }, []);

  const handleClose = () => {
    setModalProps({ ...modalProps, show: false });
  };

  const handleSubmit = (formData: FormData) => {
    // Submit the form data to create a collaborative plan
    fetch('/plan_instances', {
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
      console.error('Error creating collaborative plan:', error);
    });
  };

  return modalProps.show ? (
    <PlanCollaborationModal
      planId={modalProps.planId}
      planName={modalProps.planName}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  ) : null;
};

initApp();

// Initialize the component when DOM is loaded
document.addEventListener('turbo:load', function() {
  initApp();
});

function initApp() {
  const container = document.getElementById('start-plan-with-others-container');
  if (container) {
    render(<StartPlanWithOthersContainer />, container);
  }
}
