// Enhanced Window polyfill for React Native environment
// This provides comprehensive window object functionality that web libraries expect

if (typeof global !== 'undefined') {
  // Create a complete window object if it doesn't exist
  if (!global.window) {
    global.window = global;
  }
  
  // Event listeners management
  const eventListeners = {};
  
  // Add robust addEventListener implementation
  if (!global.window.addEventListener) {
    global.window.addEventListener = function(event, handler, options) {
      console.log(`[Window Polyfill] addEventListener called for event: ${event}`);
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
      return true; // Return true to indicate success
    };
  }
  
  // Add robust removeEventListener implementation
  if (!global.window.removeEventListener) {
    global.window.removeEventListener = function(event, handler, options) {
      console.log(`[Window Polyfill] removeEventListener called for event: ${event}`);
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(handler);
        if (index !== -1) {
          eventListeners[event].splice(index, 1);
        }
      }
      return true; // Return true to indicate success
    };
  }
  
  // Add dispatchEvent for completeness
  if (!global.window.dispatchEvent) {
    global.window.dispatchEvent = function(event) {
      console.log(`[Window Polyfill] dispatchEvent called for event: ${event.type || 'unknown'}`);
      const handlers = eventListeners[event.type] || [];
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error(`[Window Polyfill] Error in event handler: ${e}`);
        }
      });
      return true; // Return true to indicate success
    };
  }
  
  // Add other common window properties that might be expected
  if (!global.window.location) {
    global.window.location = {
      href: 'app://reactnative',
      protocol: 'app:',
      host: 'reactnative',
      hostname: 'reactnative',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
      reload: () => console.log('[Window Polyfill] location.reload called'),
      replace: (url) => console.log(`[Window Polyfill] location.replace called with: ${url}`),
      assign: (url) => console.log(`[Window Polyfill] location.assign called with: ${url}`)
    };
  }
  
  // Add navigator object
  if (!global.window.navigator) {
    global.window.navigator = {
      userAgent: 'React Native',
      platform: 'React Native',
      language: 'en',
      languages: ['en'],
      onLine: true,
      geolocation: {},
      product: 'ReactNative'
    };
  }
  
  // Add localStorage polyfill if needed
  if (!global.window.localStorage) {
    const storageData = {};
    global.window.localStorage = {
      getItem: (key) => storageData[key] || null,
      setItem: (key, value) => { storageData[key] = String(value); },
      removeItem: (key) => { delete storageData[key]; },
      clear: () => { Object.keys(storageData).forEach(key => delete storageData[key]); },
      key: (index) => Object.keys(storageData)[index] || null,
      length: 0
    };
    
    // Define length as a getter to always return current size
    Object.defineProperty(global.window.localStorage, 'length', {
      get: () => Object.keys(storageData).length
    });
  }
  
  // Add sessionStorage similar to localStorage
  if (!global.window.sessionStorage) {
    global.window.sessionStorage = global.window.localStorage;
  }
  
  // Add document stub if it doesn't exist
  if (!global.document) {
    global.document = {
      addEventListener: global.window.addEventListener,
      removeEventListener: global.window.removeEventListener,
      dispatchEvent: global.window.dispatchEvent,
      createElement: function(tagName) {
        console.log(`[Window Polyfill] document.createElement called for: ${tagName}`);
        return {
          style: {},
          setAttribute: () => {},
          appendChild: () => {},
          removeChild: () => {},
          addEventListener: global.window.addEventListener,
          removeEventListener: global.window.removeEventListener
        };
      },
      getElementById: function(id) {
        console.log(`[Window Polyfill] document.getElementById called for: ${id}`);
        return null;
      },
      getElementsByTagName: function(name) {
        console.log(`[Window Polyfill] document.getElementsByTagName called for: ${name}`);
        return [];
      },
      getElementsByClassName: function(name) {
        console.log(`[Window Polyfill] document.getElementsByClassName called for: ${name}`);
        return [];
      },
      querySelector: function(selector) {
        console.log(`[Window Polyfill] document.querySelector called for: ${selector}`);
        return null;
      },
      querySelectorAll: function(selector) {
        console.log(`[Window Polyfill] document.querySelectorAll called for: ${selector}`);
        return [];
      },
      documentElement: {
        style: {}
      },
      head: { appendChild: () => {}, removeChild: () => {} },
      body: { appendChild: () => {}, removeChild: () => {} }
    };
  }
  
  console.log('[Window Polyfill] Enhanced window polyfill loaded for React Native environment');
}
