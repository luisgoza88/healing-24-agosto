import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  color?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showText = true,
  color = Colors.primary.dark 
}) => {
  const sizes = {
    small: { circle: 40, text: 14 },
    medium: { circle: 60, text: 20 },
    large: { circle: 80, text: 28 }
  };

  const currentSize = sizes[size];

  return (
    <View className="items-center">
      <View 
        style={{
          width: currentSize.circle,
          height: currentSize.circle,
          borderRadius: currentSize.circle / 2,
          borderWidth: 2,
          borderColor: color,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text 
          style={{ 
            fontSize: currentSize.text, 
            fontWeight: 'bold',
            color: color 
          }}
        >
          HF
        </Text>
      </View>
      {showText && (
        <View className="flex-row mt-2">
          <Text 
            style={{ 
              fontSize: currentSize.text * 0.8, 
              fontWeight: 'bold',
              color: color 
            }}
          >
            Healing
          </Text>
          <Text 
            style={{ 
              fontSize: currentSize.text * 0.8, 
              fontWeight: '300',
              color: color,
              marginLeft: 4
            }}
          >
            Forest
          </Text>
        </View>
      )}
    </View>
  );
};