import React, { useState, useEffect } from 'react';
import { 
  Image, 
  ImageProps, 
  View, 
  ActivityIndicator, 
  StyleSheet,
  ImageStyle,
  ViewStyle 
} from 'react-native';
import { Colors } from '../constants/colors';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  style?: ImageStyle | ImageStyle[];
  containerStyle?: ViewStyle;
  showLoading?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  style,
  containerStyle,
  showLoading = false,
  priority = 'normal',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Precargar la imagen cuando el componente se monta
    Image.prefetch(uri).catch(() => {
      console.warn('Failed to prefetch image:', uri);
    });
  }, [uri]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        {...props}
        source={{ 
          uri,
          priority,
          cache: 'default' // Usar caché por defecto
        }}
        style={style}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(error) => {
          console.error('Error loading image:', uri, error.nativeEvent);
          setError(true);
          setLoading(false);
        }}
      />
      {showLoading && loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={Colors.primary.green} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});