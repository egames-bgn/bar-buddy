/**
 * Custom implementation of use-latest-callback
 * This is a replacement for the problematic npm package
 */
'use strict';

const React = require('react');

function useLatestCallback(callback) {
  const ref = React.useRef(callback);
  ref.current = callback;
  return React.useCallback((...args) => ref.current(...args), []);
}

module.exports = useLatestCallback;
module.exports.default = useLatestCallback;
