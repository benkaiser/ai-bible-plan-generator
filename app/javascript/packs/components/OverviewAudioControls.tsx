import { h, Component } from 'preact';

interface OverviewAudioControlsProps {
  planInstanceId: number;
  dayNumber: number;
}

interface OverviewAudioControlsState {
  isPlaying: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  audioUrl: string | null;
}

export default class OverviewAudioControls extends Component<OverviewAudioControlsProps, OverviewAudioControlsState> {
  private audioRef: HTMLAudioElement | null = null;
  private timeUpdateInterval: number | null = null;

  constructor(props: OverviewAudioControlsProps) {
    super(props);
    this.state = {
      isPlaying: false,
      isLoading: true,
      isGenerating: true,
      currentTime: 0,
      duration: 0,
      error: null,
      audioUrl: null,
    };
  }

  componentDidMount() {
    this.generateAndFetchAudio();
  }

  componentDidUpdate(prevProps: OverviewAudioControlsProps) {
    if (prevProps.dayNumber !== this.props.dayNumber ||
        prevProps.planInstanceId !== this.props.planInstanceId) {
      this.generateAndFetchAudio();
    }
  }

  componentWillUnmount() {
    if (this.timeUpdateInterval) {
      window.clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
      this.audioRef.removeEventListener('error', this.handleError);
      this.audioRef.removeEventListener('ended', this.handleEnded);
      this.audioRef = null;
    }
  }

  generateAndFetchAudio() {
    const { planInstanceId, dayNumber } = this.props;

    // Reset state
    this.setState({
      isPlaying: true,
      isLoading: true,
      isGenerating: true,
      currentTime: 0,
      duration: 0,
      error: null,
      audioUrl: null
    });

    // Clean up any existing audio instance
    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
      this.audioRef.removeEventListener('error', this.handleError);
      this.audioRef.removeEventListener('ended', this.handleEnded);
      this.audioRef = null;
    }

    // Make API call to generate TTS audio
    fetch(`/plan_instances/${planInstanceId}/get_daily_reading_tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({ day_number: dayNumber }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.audio_url) {
        this.setState({
          audioUrl: data.audio_url,
          isGenerating: false
        }, () => {
          this.initializeAudio(data.audio_url);
        });
      } else {
        this.setState({
          error: data.error || 'Failed to generate audio',
          isGenerating: false,
          isLoading: false
        });
      }
    })
    .catch(error => {
      console.error('Error generating audio:', error);
      this.setState({
        error: 'Error generating audio. Please try again later.',
        isGenerating: false,
        isLoading: false
      });
    });
  }

  initializeAudio(audioUrl: string) {
    // Create new audio element
    this.audioRef = new Audio(audioUrl);
    this.audioRef.autoplay = true;
    this.audioRef.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.audioRef.addEventListener('error', this.handleError);
    this.audioRef.addEventListener('ended', this.handleEnded);

    // Set up the time update interval
    this.setupTimeUpdateInterval();
  }

  setupTimeUpdateInterval() {
    // Clear any existing interval first
    if (this.timeUpdateInterval) {
      window.clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    // Set up time monitoring
    this.timeUpdateInterval = window.setInterval(() => {
      if (!this.audioRef) return;
      this.setState({ currentTime: this.audioRef.currentTime });
    }, 300);
  }

  handleLoadedMetadata = () => {
    if (this.audioRef) {
      this.setState({
        isLoading: false,
        duration: this.audioRef.duration || 0
      });
    }
  };

  handleError = (e: ErrorEvent) => {
    console.error('Audio error:', e);
    this.setState({
      isLoading: false,
      error: 'Error loading audio.'
    });
  };

  handleEnded = () => {
    this.setState({ isPlaying: false });
    if (this.timeUpdateInterval) {
      window.clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  };

  togglePlayPause = () => {
    if (!this.audioRef) return;

    if (this.state.isPlaying) {
      this.audioRef.pause();
      if (this.timeUpdateInterval) {
        window.clearInterval(this.timeUpdateInterval);
        this.timeUpdateInterval = null;
      }
    } else {
      this.audioRef.play();
      this.setupTimeUpdateInterval();
    }

    this.setState({ isPlaying: !this.state.isPlaying });
  };

  handleSeek = (e: Event) => {
    if (!this.audioRef) return;
    const target = e.target as HTMLInputElement;
    const seekTime = parseFloat(target.value);
    this.audioRef.currentTime = seekTime;
    this.setState({ currentTime: seekTime });
  };

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    const { isPlaying, isLoading, isGenerating, currentTime, duration, error } = this.state;

    if (error) {
      return <div className="alert alert-danger">{error}</div>;
    }

    if (isGenerating) {
      return (
        <div className="d-flex align-items-center">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>Generating audio...</span>
        </div>
      );
    }

    return (
      <div className="overview-audio-controls mb-3">
        <div className="d-flex align-items-center">
          <button
            className="btn btn-sm btn-primary me-2"
            onClick={this.togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : isPlaying ? (
              <span>
                <i className="bi bi-pause-fill"></i>
              </span>
            ) : (
              <span>
                <i className="bi bi-play-fill"></i>
              </span>
            )}
          </button>

          <div className="flex-grow-1 mx-2" style="width: 100%">
            <input
              type="range"
              className="form-range"
              min="0"
              max={duration || 1}
              step="0.1"
              value={currentTime}
              onInput={this.handleSeek}
              style="width: 100%"
            />
          </div>

          <div className="ms-2 text-muted small">
            { duration !== 0 ? <span>{this.formatTime(currentTime)}</span> : <span>0:00</span> }
          </div>
        </div>
      </div>
    );
  }
}
