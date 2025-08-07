import { View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

type ThemedViewProps = {
  style?: any;
  lightColor?: string;
  darkColor?: string;
  colorName?: 'background' | 'cardBackground' | 'headerBackground' | string;
  children?: React.ReactNode;
  [key: string]: any;
};

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, colorName = 'background', ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, colorName as any);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
