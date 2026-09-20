/**
 * Mount the cursor butterflies for as long as this is rendered.
 *
 * Thin on purpose, for the same reason the field's wrapper is: the animation
 * is plain DOM, and React's only job is to start it and tear it down. Nothing
 * in the loop touches React state.
 */

import { useEffect } from 'react';

import { mountCursorButterflies, type CursorButterflyOptions } from './follow';

export function CursorButterflies(options: CursorButterflyOptions = {}) {
  const { count, size, respectReducedMotion } = options;

  useEffect(() => {
    const swarm = mountCursorButterflies({ count, size, respectReducedMotion });
    return () => swarm.destroy();
  }, [count, size, respectReducedMotion]);

  return null;
}
