import React, { createContext, useContext } from 'react';

/**
 * Simplified ThemeContext that always provides light mode
 * This ensures consistent appearance across the app
 */

interface ThemeContextType {
  colorScheme: 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always use light mode for consistent appearance
  const colorScheme: 'light' = 'light';
  
  return (
    <ThemeContext.Provider value={{ colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
