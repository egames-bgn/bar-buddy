/**
 * Custom implementation of use-latest-callback
 * This is a replacement for the problematic npm package
 */
import * as React from 'react';

export default function useLatestCallback(callback) {
  const ref = React.useRef(callback);
  ref.current = callback;
  return React.useCallback((...args) => ref.current(...args), []);
}
