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
  planVisibility: 'public' | 'private';
  isCreator: boolean;
  slug: string;
  slugValidationState: {
    isChecking: boolean;
    isValid: boolean;
    isInvalid: boolean;
    errorMessage: string;
  };
  savingSettings: boolean;
  settingsSuccessMessage: string;
}

class UserManagementModal extends Component<IUserManagementModalProps, IUserManagementModalState> {
  private debounceTimer: number | null = null;
  private slugDebounceTimer: number | null = null;

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
      successMessage: '',
      planVisibility: 'private',
      isCreator: false,
      slug: '',
      slugValidationState: {
        isChecking: false,
        isValid: false,
        isInvalid: false,
        errorMessage: ''
      },
      savingSettings: false,
      settingsSuccessMessage: ''
    };
  }

  componentDidUpdate(prevProps: IUserManagementModalProps) {
    if (!prevProps.show && this.props.show) {
      this.fetchMembers();
      this.fetchPlanSettings();
    }
  }

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.slugDebounceTimer) {
      clearTimeout(this.slugDebounceTimer);
    }
  }

  fetchPlanSettings = async () => {
    try {
      const response = await fetch(`/plan_instances/${this.props.planInstanceId}/settings`);
      if (response.ok) {
        const data = await response.json();
        this.setState({
          planVisibility: data.visibility || 'private',
          slug: data.slug || '',
          isCreator: this.props.planInstanceUser.creator
        });
      } else {
        console.error('Failed to fetch plan settings');
      }
    } catch (error) {
      console.error('Error fetching plan settings:', error);
    }
  };

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

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

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

  validateSlug = async (value: string) => {
    if (!value.trim()) {
      this.setState({
        slugValidationState: {
          isChecking: false,
          isValid: false,
          isInvalid: false,
          errorMessage: ''
        }
      });
      return;
    }

    const slugRegex = /^[a-z0-9\-_]+$/;
    if (!slugRegex.test(value)) {
      this.setState({
        slugValidationState: {
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'Only lowercase letters, numbers, hyphens and underscores are allowed'
        }
      });
      return;
    }

    if (value.length < 3 || value.length > 50) {
      this.setState({
        slugValidationState: {
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'Length must be between 3 and 50 characters'
        }
      });
      return;
    }

    this.setState({
      slugValidationState: {
        ...this.state.slugValidationState,
        isChecking: true,
        isValid: false,
        isInvalid: false
      }
    });

    try {
      const response = await fetch(`/plan_instances/check_slug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({
          slug: value,
          current_plan_instance_id: this.props.planInstanceId
        })
      });

      const data = await response.json();

      if (data.available) {
        this.setState({
          slugValidationState: {
            isChecking: false,
            isValid: true,
            isInvalid: false,
            errorMessage: ''
          }
        });
      } else {
        this.setState({
          slugValidationState: {
            isChecking: false,
            isValid: false,
            isInvalid: true,
            errorMessage: 'This URL is already taken'
          }
        });
      }
    } catch (error) {
      console.error('Error checking slug:', error);
      this.setState({
        slugValidationState: {
          isChecking: false,
          isValid: false,
          isInvalid: true,
          errorMessage: 'Error checking URL availability'
        }
      });
    }
  };

  handleSlugChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    this.setState({ slug: value });

    if (this.slugDebounceTimer) {
      clearTimeout(this.slugDebounceTimer);
    }

    if (value.trim()) {
      this.setState(prevState => ({
        slugValidationState: {
          ...prevState.slugValidationState,
          isChecking: true,
          isValid: false,
          isInvalid: false
        }
      }));
    }

    this.slugDebounceTimer = setTimeout(() => {
      this.validateSlug(value);
    }, 300);
  };

  handleVisibilityChange = (e: Event) => {
    this.setState({
      planVisibility: (e.target as HTMLSelectElement).value as 'public' | 'private'
    });
  };

  handleSaveSettings = async (e: Event) => {
    e.preventDefault();

    if (this.state.slug.trim() && !this.state.slugValidationState.isValid) {
      return;
    }

    this.setState({ savingSettings: true, settingsSuccessMessage: '' });

    try {
      const response = await fetch(`/plan_instances/${this.props.planInstanceId}/update_settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({
          visibility: this.state.planVisibility,
          slug: this.state.slug
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.setState({
          settingsSuccessMessage: 'Plan settings updated successfully!'
        });
      } else {
        const error = await response.json();
        console.error('Failed to update plan settings:', error);
      }
    } catch (error) {
      console.error('Error updating plan settings:', error);
    } finally {
      this.setState({ savingSettings: false });
    }
  };

  handleTabChange = (key: string) => {
    this.setState({ activeTab: key });
  };

  render() {
    const { show, onClose } = this.props;
    const {
      members, loading, username, validationState, activeTab, inviting, successMessage,
      planVisibility, isCreator, slug, slugValidationState, savingSettings, settingsSuccessMessage
    } = this.state;

    const planUrl = slug ?
      `${window.location.origin}/p/${slug}` :
      `${window.location.origin}/plan_instances/${this.props.planInstanceId}`;

    return (
      <Modal show={show} onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title>Plan Management</Modal.Title>
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

            {isCreator && (
              <Tab eventKey="settings" title="Settings">
                <h5>Plan Settings</h5>
                {settingsSuccessMessage && (
                  <div className="alert alert-success mb-3">{settingsSuccessMessage}</div>
                )}
                <Form onSubmit={this.handleSaveSettings}>
                  <Form.Group className="mb-3">
                    <Form.Label>Plan Visibility</Form.Label>
                    <Form.Select
                      value={planVisibility}
                      onChange={this.handleVisibilityChange}
                      aria-label="Plan visibility"
                    >
                      <option value="private">Private (by invitation only)</option>
                      <option value="public">Public (anyone can join)</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {planVisibility === 'public' ?
                        'Anyone with the link can view and join this plan.' :
                        'Only invited users can access this plan.'}
                    </Form.Text>
                  </Form.Group>

                  {planVisibility === 'public' && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Friendly URL</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type="text"
                            placeholder="my-awesome-plan"
                            value={slug}
                            onChange={this.handleSlugChange}
                            isValid={slugValidationState.isValid}
                            isInvalid={slugValidationState.isInvalid}
                            disabled={savingSettings}
                          />
                          {slugValidationState.isChecking && (
                            <div className="position-absolute top-0 end-0 pe-3 pt-2">
                              <span className="spinner-border spinner-border-sm text-secondary" role="status"></span>
                            </div>
                          )}
                          <Form.Control.Feedback type="invalid">
                            {slugValidationState.errorMessage}
                          </Form.Control.Feedback>
                          <Form.Text className="text-muted">
                            Use only lowercase letters, numbers, hyphens and underscores.
                          </Form.Text>
                        </div>
                      </Form.Group>

                      <div className="mb-3">
                        <Form.Label>Public Plan URL</Form.Label>
                        <div className="input-group">
                          <Form.Control
                            type="text"
                            value={planUrl}
                            readOnly
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(planUrl);
                              this.setState({ settingsSuccessMessage: 'URL copied to clipboard!' });
                            }}
                          >
                            <i className="bi bi-clipboard"></i>
                          </Button>
                        </div>
                        <Form.Text className="text-muted">
                          Share this URL with others to join your plan.
                        </Form.Text>
                      </div>
                    </>
                  )}

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={savingSettings || (planVisibility === 'public' && slug && !slugValidationState.isValid)}
                  >
                    {savingSettings ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : 'Save Settings'}
                  </Button>
                </Form>
              </Tab>
            )}
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
