/**
 * A thin React wrapper over the field.
 *
 * Thin on purpose: the animation is plain DOM, and React's only jobs here are
 * to own the container element and to tear the field down on unmount. Nothing
 * in the loop touches React state, because a component re-rendering sixty
 * times a second is the failure this design exists to avoid.
 */

import { useEffect, useRef } from 'react';

import { mountButterflies, type ButterflyField } from './field';
import type { ButterflyOptions } from './options';

export interface ButterflyLoaderProps extends ButterflyOptions {
  /** Positioning is yours. Defaults to filling its nearest positioned parent. */
  style?: React.CSSProperties;
  className?: string;
  /** Receives the handle, so you can call release() or skip() from outside. */
  fieldRef?: (field: ButterflyField | null) => void;
}

export function ButterflyLoader({
  style,
  className,
  fieldRef,
  ...options
}: ButterflyLoaderProps) {
  const host = useRef<HTMLDivElement | null>(null);

  // Callbacks are read through a ref so that a parent re-rendering with a new
  // closure does not tear down and rebuild a field of several thousand.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const field = mountButterflies(el, {
      ...latest.current,
      onReveal: () => latest.current.onReveal?.(),
      onRelease: (x, y) => latest.current.onRelease?.(x, y),
    });
    fieldRef?.(field);

    return () => {
      fieldRef?.(null);
      field.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={host}
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}
    />
  );
}
