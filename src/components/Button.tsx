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

  const sizeStyles = {
    small: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
    },
    medium: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      fontSize: 16,
    },
    large: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      fontSize: 18,
    }
  };

  const variantStyles = getVariantStyles();
  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          borderRadius: 50,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        variantStyles.button,
        style
      ]}
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
            {
              fontSize: currentSize.fontSize,
              fontWeight: '600',
            },
            variantStyles.text,
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};