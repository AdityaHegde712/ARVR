// ─── Type declarations for the non-standard Web Speech API ────────────────────
// The SpeechRecognition API is not part of TypeScript's standard DOM lib.
// These interfaces match the Chrome implementation (webkit prefixed).

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onnomatch: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

declare var SpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceResultCallback = (transcript: string, isFinal: boolean) => void;
export type VoiceErrorCallback = (error: string) => void;

// ─── VoiceInput Class ─────────────────────────────────────────────────────────

/**
 * Browser SpeechRecognition wrapper.
 *
 * Provides a clean API for voice input with support for interim results,
 * error handling, and cross-browser fallback detection.
 */
export class VoiceInput {
  private recognition: SpeechRecognition | null = null;
  private resultCallback: VoiceResultCallback | null = null;
  private errorCallback: VoiceErrorCallback | null = null;
  private listening = false;

  /** Whether SpeechRecognition is available in this browser. */
  readonly isSupported: boolean;

  constructor() {
    this.isSupported = this.detectSupport();
    if (this.isSupported) {
      this.initRecognition();
    }
  }

  /**
   * Check if the Web Speech API is available.
   */
  private detectSupport(): boolean {
    if (typeof window === 'undefined') return false;

    return !!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition
    );
  }

  /**
   * Initialise the SpeechRecognition instance with default settings.
   */
  private initRecognition(): void {
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.listening = false;
      return;
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIndex = event.results.length - 1;
      const result = event.results[lastIndex];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      if (transcript.trim()) {
        this.resultCallback?.(transcript, isFinal);
      }
    };

    // Handle errors
    recognition.onerror = (event: { error: string }) => {
      switch (event.error) {
        case 'no-speech':
          this.errorCallback?.('No speech was detected. Please try again.');
          break;
        case 'audio-capture':
          this.errorCallback?.(
            'No microphone was found. Ensure your device has a working microphone.',
          );
          break;
        case 'not-allowed':
          this.errorCallback?.(
            'Microphone permission was denied. Please allow microphone access to use voice input.',
          );
          break;
        case 'aborted':
          // User or system aborted — not an error
          break;
        default:
          this.errorCallback?.(`Speech recognition error: ${event.error}`);
      }
    };

    // Auto-restart on end if we're still supposed to be listening
    recognition.onend = () => {
      if (this.listening) {
        try {
          recognition.start();
        } catch {
          // If start() fails while already starting, ignore
          this.listening = false;
        }
      }
    };

    this.recognition = recognition;
  }

  /**
   * Start listening for voice input.
   * Requests microphone permission if not already granted.
   */
  start(): void {
    if (!this.recognition || !this.isSupported) {
      this.errorCallback?.('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.listening) return;

    this.listening = true;

    try {
      this.recognition.start();
    } catch {
      // May throw if already started
      this.listening = false;
    }
  }

  /**
   * Stop listening for voice input.
   */
  stop(): void {
    if (!this.recognition) return;

    this.listening = false;

    try {
      this.recognition.stop();
    } catch {
      // Ignore errors on stop
    }
  }

  /**
   * Register a callback for voice recognition results.
   * The callback receives the transcript and whether it's a final result.
   */
  onResult(callback: VoiceResultCallback): void {
    this.resultCallback = callback;
  }

  /**
   * Register a callback for voice recognition errors.
   */
  onError(callback: VoiceErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Whether the voice input is currently listening.
   */
  get isListening(): boolean {
    return this.listening;
  }
}
