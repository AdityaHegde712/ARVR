import { useEffect, useState, useCallback, useRef } from 'react';
import {
  initScene,
  requestARSession,
  endARSession,
  startAnimationLoop,
  stopAnimationLoop,
  addStateChangeListener,
  getSessionState,
  getReferenceSpace,
  getScene,
} from '../xr/ARScene';
import { initHitTest, updateHitTest, disposeHitTest } from '../xr/HitTestManager';
import { setScene } from '../xr/ModelPlacer';
import type { SessionState } from '../xr/ARScene';

export interface UseARSessionReturn {
  /** null while checking, true/false once determined */
  isSupported: boolean | null;
  /** Current session state */
  sessionState: SessionState;
  /** Human-readable error message, or null */
  error: string | null;
  /**
   * Request an AR session and bind it to the given canvas.
   * Also initialises the hit-test system and links ModelPlacer.
   */
  requestSession: (canvas: HTMLCanvasElement) => Promise<void>;
  /** End the active AR session */
  endSession: () => void;
}

/**
 * React hook that wraps the AR session lifecycle.
 *
 * On mount: checks `navigator.xr.isSessionSupported('immersive-ar')`.
 * `requestSession(canvas)` must be called with the <canvas> element once the
 * component is mounted (typically in a useEffect or onClick handler).
 */
export function useARSession(): UseARSessionReturn {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(
    getSessionState(),
  );
  const [error, setError] = useState<string | null>(null);

  // Track whether we have already initialised the scene to avoid double-init
  const sceneInited = useRef(false);

  // Check AR support on mount
  useEffect(() => {
    let cancelled = false;

    if (!navigator.xr) {
      setIsSupported(false);
      return;
    }

    navigator.xr
      .isSessionSupported('immersive-ar')
      .then((supported) => {
        if (!cancelled) {
          setIsSupported(supported);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSupported(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to session state changes from the module
  useEffect(() => {
    const unsub = addStateChangeListener((newState) => {
      setSessionState(newState);
    });
    return unsub;
  }, []);

  const requestSession = useCallback(
    async (canvas: HTMLCanvasElement) => {
      setError(null);

      try {
        // Lazy-init the scene (only once)
        if (!sceneInited.current) {
          initScene(canvas);
          sceneInited.current = true;

          // Link ModelPlacer to the scene
          const s = getScene();
          if (s) {
            setScene(s);
          }
        }

        // Request the AR session
        const session = await requestARSession();
        const refSpace = getReferenceSpace();
        const scn = getScene();

        // Initialise hit-testing
        if (session && refSpace && scn) {
          await initHitTest(session, refSpace, scn);
        }

        // Start the render loop; pipe XR frames to HitTestManager
        startAnimationLoop((frame: XRFrame, _time: number) => {
          const rs = getReferenceSpace();
          if (rs) {
            updateHitTest(frame, rs);
          }
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to start AR session';
        setError(message);
      }
    },
    [],
  );

  const endSession = useCallback(() => {
    stopAnimationLoop();
    disposeHitTest();
    endARSession();
  }, []);

  return { isSupported, sessionState, requestSession, endSession, error };
}
