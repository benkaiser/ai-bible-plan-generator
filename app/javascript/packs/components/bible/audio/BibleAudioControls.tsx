import { h, Component } from 'preact';
import { ensureAudioBookId } from '../utilities';
import { getHaysTimeForLookup } from './utils';

interface BibleAudioControlsProps {
  book: string;
  chapter: number | string;
  verseRange?: string;
}

interface BibleAudioControlsState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  verseTimes: number[];
  startTime: number | null;
  endTime: number | null;
}

export default class BibleAudioControls extends Component<BibleAudioControlsProps, BibleAudioControlsState> {
  private audioRef: HTMLAudioElement | null = null;
  private timeUpdateInterval: number | null = null;

  constructor(props: BibleAudioControlsProps) {
    super(props);
    this.state = {
      isPlaying: false,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      error: null,
      verseTimes: [],
      startTime: null,
      endTime: null,
    };
  }

  componentDidMount() {
    this.initializeAudio();
    this.loadVerseTimes();
  }

  componentDidUpdate(prevProps: BibleAudioControlsProps) {
    if (prevProps.book !== this.props.book ||
        prevProps.chapter !== this.props.chapter ||
        prevProps.verseRange !== this.props.verseRange) {

      this.initializeAudio();
      this.loadVerseTimes();
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

  async loadVerseTimes() {
    const { book, chapter, verseRange } = this.props;
    const chapterNum = parseInt(chapter as string, 10);

    try {
      const verseDurations = await getHaysTimeForLookup(book, chapterNum);

      // Convert the "seconds between" format to absolute timestamps
      const verseTimes = this.convertToAbsoluteTimes(verseDurations);

      let startTime: number | null = null;
      let endTime: number | null = null;

      if (verseRange && verseTimes.length > 0) {
        const [startVerse, endVerse] = this.parseVerseRange(verseRange);

        // Use the calculated timestamps (0-indexed array)
        startTime = startVerse > 0 && startVerse <= verseTimes.length
          ? verseTimes[startVerse - 1]
          : 0;

        // If this is the last verse, let it play to the end
        endTime = endVerse < verseTimes.length
          ? verseTimes[endVerse]
          : null;
      }

      this.setState({
        verseTimes,
        startTime,
        endTime
      }, () => {
        if (this.audioRef && startTime !== null) {
          this.audioRef.currentTime = startTime;
        }
      });
    } catch (error) {
      console.error('Error loading verse times:', error);
    }
  }

  /**
   * Converts "seconds between" format to absolute timestamps
   * For example: [3, 5, 7] becomes [0, 3, 8, 15]
   * Where each value is the start time of the verse
   */
  convertToAbsoluteTimes(secondsBetween: number[]): number[] {
    const absoluteTimes: number[] = [];
    let cumulativeTime = 0;

    // Calculate absolute timestamps for each verse start
    for (const duration of secondsBetween) {
      cumulativeTime += duration;
      absoluteTimes.push(cumulativeTime);
    }

    return absoluteTimes;
  }

  parseVerseRange(verseRange: string): [number, number] {
    const parts = verseRange.split('-');
    const startVerse = parseInt(parts[0], 10);
    const endVerse = parts.length > 1 ? parseInt(parts[1], 10) : startVerse;
    return [startVerse, endVerse];
  }

  initializeAudio() {
    // Cleanup previous audio instance
    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
      this.audioRef.removeEventListener('error', this.handleError);
      this.audioRef.removeEventListener('ended', this.handleEnded);
    }

    // Create new audio element
    this.audioRef = new Audio(this.getAudioUrl());
    this.audioRef.autoplay = true;
    this.audioRef.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.audioRef.addEventListener('error', this.handleError);
    this.audioRef.addEventListener('ended', this.handleEnded);

    // Reset state
    this.setState({
      isPlaying: true,
      isLoading: true,
      currentTime: 0,
      duration: 0,
      error: null
    });

    // Set up the time update interval since we're autoplaying
    this.setupTimeUpdateInterval();
  }

  setupTimeUpdateInterval() {
    // Clear any existing interval first
    if (this.timeUpdateInterval) {
      window.clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    // Set up time monitoring for verse range control
    this.timeUpdateInterval = window.setInterval(() => {
      if (!this.audioRef) return;

      const currentTime = this.audioRef.currentTime;
      this.setState({ currentTime });

      // If we have reached the end time, stop playback
      const { endTime } = this.state;
      if (endTime !== null && currentTime >= endTime) {
        this.audioRef.pause();
        if (this.timeUpdateInterval) {
          window.clearInterval(this.timeUpdateInterval);
          this.timeUpdateInterval = null;
        }
        this.setState({ isPlaying: false });
      }
    }, 300);
  }

  getAudioUrl() {
    const { book, chapter } = this.props;
    const audioBookId = ensureAudioBookId(book);
    // padstart 2 the chapter
    let chapterStr = chapter.toString().padStart(2, '0');
    if (audioBookId === 'Psa') {
      // Special case for Psalms
      chapterStr = chapter.toString().padStart(3, '0');
    }
    return `https://tim.z73.com/hays/audio/${audioBookId}${chapterStr}.mp3`;
  }

  handleLoadedMetadata = () => {
    if (this.audioRef) {
      this.setState({
        isLoading: false,
        duration: this.audioRef.duration || 0
      });

      // If we have a startTime, set the currentTime to that
      if (this.state.startTime !== null) {
        this.audioRef.currentTime = this.state.startTime;
      }
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

    const { isPlaying, startTime, endTime, currentTime, duration } = this.state;

    // Check if audio has finished playing (either reached end of track or end time)
    const hasEnded = (endTime !== null && currentTime >= endTime) ||
                    (currentTime >= duration && duration > 0);

    if (isPlaying) {
      this.audioRef.pause();
      if (this.timeUpdateInterval) {
        window.clearInterval(this.timeUpdateInterval);
        this.timeUpdateInterval = null;
      }
    } else {
      // Reset position if track has ended
      if (hasEnded) {
        // Reset to start time (if specified) or beginning of track
        const resetPosition = startTime !== null ? startTime : 0;
        this.audioRef.currentTime = resetPosition;
        this.setState({ currentTime: resetPosition });
      }

      this.audioRef.play();
      this.setupTimeUpdateInterval();
    }

    this.setState({ isPlaying: !isPlaying });
  };

  handleSeek = (e: Event) => {
    if (!this.audioRef) return;

    const target = e.target as HTMLInputElement;
    const seekTime = parseFloat(target.value);
    const { startTime, endTime } = this.state;

    // If we have start/end time constraints, adjust the actual seek position
    let actualSeekTime = seekTime;
    if (startTime !== null) {
      // Convert relative slider position to actual audio position
      actualSeekTime = startTime + parseFloat(target.value);
    }

    // Ensure we don't seek beyond the end time if set
    if (endTime !== null && actualSeekTime > endTime) {
      actualSeekTime = endTime;
    }

    this.audioRef.currentTime = actualSeekTime;
    this.setState({ currentTime: actualSeekTime });
  };

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    const { isPlaying, isLoading, currentTime, duration, error, startTime, endTime } = this.state;

    if (error) {
      return <div className="alert alert-danger">{error}</div>;
    }

    // Calculate effective min, max, and current values for the slider
    const minValue = 0;
    let maxValue = endTime !== null ? (endTime - (startTime || 0)) : duration || 1;
    if (startTime !== null && endTime === null) {
      maxValue = duration - startTime;
    }
    const currentValue = startTime !== null ? Math.max(0, currentTime - startTime) : currentTime;

    // Format display times - show relative to verse range if applicable
    const displayCurrentTime = startTime !== null ?
      this.formatTime(Math.max(0, currentTime - startTime)) :
      this.formatTime(currentTime);

    return (
      <div className="bible-audio-controls mb-3">
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
              min={minValue}
              max={maxValue}
              step="0.1"
              value={currentValue}
              onInput={this.handleSeek}
              style="width: 100%"
            />
          </div>

          <div className="ms-2 text-muted small">
            { duration !== 0 ? <span>{displayCurrentTime}</span> : <span>0:00</span> }
          </div>
        </div>
      </div>
    );
  }
}
