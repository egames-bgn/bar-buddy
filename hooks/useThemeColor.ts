/**
 * Hook to get standardized colors from the app's color palette
 */

import { Colors } from '@/constants/Colors';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  // Use the light prop if provided, otherwise use the standard color
  if (props.light) {
    return props.light;
  }
  
  return Colors[colorName];
}
