import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceInput } from '../ai/VoiceInput';

export interface UseVoiceInputReturn {
  /** Whether the microphone is currently listening */
  isListening: boolean;
  /** The latest transcript text (updates with interim and final results) */
  transcript: string;
  /** Whether Web Speech API is supported in this browser */
  isSupported: boolean;
  /** Start listening for voice input */
  startListening: () => void;
  /** Stop listening for voice input */
  stopListening: () => void;
  /** Error message if something went wrong, or null */
  error: string | null;
}

const SILENCE_TIMEOUT_MS = 2000; // Auto-stop after 2 seconds of silence

/**
 * React hook that wraps the VoiceInput class.
 *
 * - Auto-stops after detecting silence (no final result within the timeout).
 * - Swallows interim results; exposes the latest final transcript via `transcript`.
 * - If the browser doesn't support SpeechRecognition, returns `isSupported: false`.
 *
 * Usage:
 * ```tsx
 * const { isListening, transcript, isSupported, startListening, stopListening, error } = useVoiceInput();
 * ```
 */
export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voiceInputRef = useRef<VoiceInput | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialise on mount
  useEffect(() => {
    const voiceInput = new VoiceInput();
    voiceInputRef.current = voiceInput;
    setIsSupported(voiceInput.isSupported);

    // Wire up result callback
    voiceInput.onResult((text: string, isFinal: boolean) => {
      if (isFinal) {
        setTranscript(text);

        // Reset silence timer on final result
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Auto-stop after silence
        silenceTimerRef.current = setTimeout(() => {
          voiceInput.stop();
          setIsListening(false);
        }, SILENCE_TIMEOUT_MS);
      }
    });

    // Wire up error callback
    voiceInput.onError((errMsg: string) => {
      setError(errMsg);
      setIsListening(false);
    });

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      voiceInput.stop();
      voiceInputRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const voiceInput = voiceInputRef.current;
    if (!voiceInput || !voiceInput.isSupported) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript(''); // Clear previous transcript
    voiceInput.start();
    setIsListening(true);

    // Safety timeout: stop after 10 seconds even if still speaking
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      voiceInput.stop();
      setIsListening(false);
    }, 10_000);
  }, []);

  const stopListening = useCallback(() => {
    const voiceInput = voiceInputRef.current;
    if (!voiceInput) return;

    voiceInput.stop();
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    error,
  };
}
