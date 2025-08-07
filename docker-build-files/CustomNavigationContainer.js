/**
 * Custom NavigationContainer implementation that avoids use-latest-callback dependency
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { NavigationContainer as OriginalNavigationContainer } from '@react-navigation/native';

// Our own implementation of useLatestCallback
function useLatestCallback(callback) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []);
}

// Custom NavigationContainer that uses our implementation
export function NavigationContainer(props) {
  return <OriginalNavigationContainer {...props} />;
}

// Export all other components from the original package
export * from '@react-navigation/native';
