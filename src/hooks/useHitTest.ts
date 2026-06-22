import { useEffect, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import {
  getActiveHitPosition,
  isHitSurfaceDetected,
} from '../xr/HitTestManager';

export interface UseHitTestReturn {
  /** Current world position of the detected surface (null if none) */
  activeHitPosition: THREE.Vector3 | null;
  /** Whether a horizontal surface is currently being detected */
  isSurfaceDetected: boolean;
  /**
   * Returns the current hit-test position, or null if no surface is detected.
   * Intended to be called from a tap/click handler.
   */
  handleTap: () => THREE.Vector3 | null;
}

/**
 * React hook that polls the HitTestManager each animation frame and exposes
 * the current hit-test position and surface detection state.
 */
export function useHitTest(): UseHitTestReturn {
  const [activeHitPosition, setActiveHitPosition] =
    useState<THREE.Vector3 | null>(null);
  const [isSurfaceDetected, setIsSurfaceDetected] = useState(false);

  // Keep a ref to the latest position so handleTap can read it synchronously
  const latestPositionRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    let frameId: number;

    const poll = () => {
      const pos = getActiveHitPosition();
      const detected = isHitSurfaceDetected();

      // Only update React state if something changed
      if (pos) {
        if (
          !latestPositionRef.current ||
          !latestPositionRef.current.equals(pos)
        ) {
          setActiveHitPosition(pos.clone());
        }
        latestPositionRef.current = pos;
      } else if (latestPositionRef.current !== null) {
        setActiveHitPosition(null);
        latestPositionRef.current = null;
      }

      if (detected !== isSurfaceDetected) {
        setIsSurfaceDetected(detected);
      }

      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleTap = useCallback((): THREE.Vector3 | null => {
    const pos = getActiveHitPosition();
    return pos ? pos.clone() : null;
  }, []);

  return { activeHitPosition, isSurfaceDetected, handleTap };
}
