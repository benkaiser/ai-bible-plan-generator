import { Component, h, Fragment } from 'preact';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

interface IUserManagementModalProps {
  planInstanceId: number;
  planInstanceUser: any;
  show: boolean;
  onClose: () => void;
}

interface IPlanMember {
  id: number;
  username: string;
  status: 'active' | 'pending' | 'completed';
  completedAt?: string;
  isCreator: boolean;
}

interface IUserManagementModalState {
  members: IPlanMember[];
  loading: boolean;
  username: string;
  validationState: {
    isChecking: boolean;
    isValid: boolean;
    isInvalid: boolean;
    errorMessage: string;
  };
  activeTab: string;
  inviting: boolean;
  successMessage: string;
}

class UserManagementModal extends Component<IUserManagementModalProps, IUserManagementModalState> {
  private debounceTimer: number | null = null;

  constructor(props: IUserManagementModalProps) {
    super(props);
    this.state = {
      members: [],
      loading: true,
      username: '',
      validationState: {
        isChecking: false,
        isValid: false,
        isInvalid: false,
        errorMessage: ''
      },
      activeTab: 'members',
      inviting: false,
      successMessage: ''
    };
  }

  componentDidUpdate(prevProps: IUserManagementModalProps) {
    if (!prevProps.show && this.props.show) {
      this.fetchMembers();
    }
  }

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  fetchMembers = async () => {
    try {
      this.setState({ loading: true });
      const response = await fetch(`/plan_instances/${this.props.planInstanceId}/members`);
      if (response.ok) {
        const data = await response.json();
        this.setState({ members: data.members });
      } else {
        console.error('Failed to fetch plan members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      this.setState({ loading: false });
    }
  };

  validateUsername = async (value: string) => {
    if (!value.trim()) {
      this.setState({
        validationState: {
          isChecking: false,
          isValid: false,
          isInvalid: false,
          errorMessage: ''
        }
      });
      return;
    }

    this.setState({
      validationState: {
        ...this.state.validationState,
        isChecking: true,
        isValid: false,
        isInvalid: false
      }
    });

    try {
      // First check if user exists
      const userResponse = await fetch('/users/check_username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({ username: value, check_exists: true })
      });

      const userData = await userResponse.json();
      const userExists = userData.message === "Username is already taken";

      if (!userExists) {
        this.setState({
          validationState: {
            isChecking: false,
            isValid: false,
            isInvalid: true,
            errorMessage: 'User not found'
          }
        });
        return;
      }

      // Then check if user is already a member of the plan
      const alreadyMember = this.state.members.some(
        member => member.username.toLowerCase() === value.toLowerCase()
      );

      if (alreadyMember) {
        this.setState({
          validationState: {
            isChecking: false,
            isValid: false,
            isInvalid: true,
            errorMessage: 'User is already a member of this plan'
          }
        });
        return;
      }

      this.setState({
        validationState: {
          isChecking: false,
          isValid: true,
          isInvalid: false,
          errorMessage: ''
        }
      });
    } catch (error) {
      console.error('Error checking username:', error);
      this.setState({
        validationState: {
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'Error checking username'
        }
      });
    }
  };

  handleUsernameChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    this.setState({ username: value });

    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set validation state to "checking" immediately for better UX
    if (value.trim()) {
      this.setState(prevState => ({
        validationState: {
          ...prevState.validationState,
          isChecking: true,
          isValid: false,
          isInvalid: false
        }
      }));
    }

    // Debounce the actual validation call by 200ms
    this.debounceTimer = setTimeout(() => {
      this.validateUsername(value);
    }, 200);
  };

  handleInviteUser = async (e: Event) => {
    e.preventDefault();
    if (!this.state.validationState.isValid) return;

    this.setState({ inviting: true, successMessage: '' });

    try {
      const response = await fetch(`/plan_instances/${this.props.planInstanceId}/invite_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({ username: this.state.username })
      });

      if (response.ok) {
        const result = await response.json();
        this.setState({
          successMessage: `Invitation sent to ${this.state.username}!`,
          username: '',
          validationState: {
            isChecking: false,
            isValid: false,
            isInvalid: false,
            errorMessage: ''
          }
        });
        this.fetchMembers();
      } else {
        const error = await response.json();
        this.setState({
          validationState: {
            isChecking: false,
            isValid: false,
            isInvalid: true,
            errorMessage: error.message || 'Failed to invite user'
          }
        });
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      this.setState({
        validationState: {
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'An error occurred while inviting user'
        }
      });
    } finally {
      this.setState({ inviting: false });
    }
  };

  handleTabChange = (key: string) => {
    this.setState({ activeTab: key });
  };

  render() {
    const { show, onClose } = this.props;
    const { members, loading, username, validationState, activeTab, inviting, successMessage } = this.state;

    return (
      <Modal show={show} onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title>Plan Members</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={this.handleTabChange}
            className="mb-3"
          >
            <Tab eventKey="members" title="Members">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div>
                  <h5>Active Members</h5>
                  <ul className="list-group mb-3">
                    {members
                      .filter(member => member.status === 'active')
                      .map(member => (
                        <li key={member.id} className="list-group-item d-flex justify-content-between align-items-center">
                          {member.username}
                          {member.isCreator && (
                            <span className="badge bg-primary">Creator</span>
                          )}
                        </li>
                      ))}
                  </ul>

                  {members.some(member => member.status === 'pending') && (
                    <>
                      <h5>Pending Invitations</h5>
                      <ul className="list-group mb-3">
                        {members
                          .filter(member => member.status === 'pending')
                          .map(member => (
                            <li key={member.id} className="list-group-item d-flex justify-content-between align-items-center">
                              {member.username}
                              <span className="badge bg-warning text-dark">Pending</span>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}

                  {members.some(member => member.status === 'completed') && (
                    <>
                      <h5>Completed Plan</h5>
                      <ul className="list-group mb-3">
                        {members
                          .filter(member => member.status === 'completed')
                          .map(member => (
                            <li key={member.id} className="list-group-item d-flex justify-content-between align-items-center">
                              {member.username}
                              <span className="badge bg-success">
                                Completed {member.completedAt && new Date(member.completedAt).toLocaleDateString()}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </Tab>

            <Tab eventKey="invite" title="Invite">
              <h5>Invite Users</h5>
              {successMessage && (
                <div className="alert alert-success mb-3">{successMessage}</div>
              )}
              <Form onSubmit={this.handleInviteUser}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={this.handleUsernameChange}
                      isValid={validationState.isValid}
                      isInvalid={validationState.isInvalid}
                      disabled={inviting}
                    />
                    {validationState.isChecking && (
                      <div className="position-absolute top-50 end-0 translate-middle-y pe-3">
                        <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
                      </div>
                    )}
                    <Form.Control.Feedback type="invalid">
                      {validationState.errorMessage}
                    </Form.Control.Feedback>
                  </div>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={!validationState.isValid || inviting}
                >
                  {inviting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Inviting...
                    </>
                  ) : 'Invite User'}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default UserManagementModal;
