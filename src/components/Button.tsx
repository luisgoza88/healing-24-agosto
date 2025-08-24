import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  color?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  color
}) => {
  const sizes = {
    small: 'px-4 py-2',
    medium: 'px-6 py-3',
    large: 'px-8 py-4'
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const getVariantStyles = () => {
    const baseColor = color || Colors.primary.green;
    
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: disabled ? Colors.ui.surface : baseColor },
          text: { color: '#FFFFFF' }
        };
      case 'secondary':
        return {
          button: { backgroundColor: disabled ? Colors.ui.surface : Colors.primary.beige },
          text: { color: Colors.primary.dark }
        };
      case 'outline':
        return {
          button: { 
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: disabled ? Colors.ui.surface : baseColor
          },
          text: { color: disabled ? Colors.text.light : baseColor }
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        variantStyles.button,
        style
      ]}
      className={`rounded-full items-center justify-center ${sizes[size]}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#FFFFFF' : Colors.primary.dark} 
        />
      ) : (
        <Text 
          style={[
            variantStyles.text,
            textStyle
          ]}
          className={`font-semibold ${textSizes[size]}`}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};