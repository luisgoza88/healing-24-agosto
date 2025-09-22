import { Image } from 'react-native';

// Lista de URLs de imágenes para precargar - Usando URLs públicas del bucket fotos-deslizables
export const CAROUSEL_IMAGES = [
  'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/fotos-deslizables/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.50.48%20p.m..png',
  'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/fotos-deslizables/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.51.24%20p.m..png',
  'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/fotos-deslizables/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.52.40%20p.m..png'
];

export const BREATHE_AND_MOVE_IMAGE = 'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/fotos-deslizables/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%208.26.33%20p.m..png';

// URLs originales de Supabase (para referencia cuando se configure el bucket):
// CAROUSEL_IMAGES = [
//   'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.50.48%20p.m..png',
//   'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.51.24%20p.m..png',
//   'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.52.40%20p.m..png'
// ];
// BREATHE_AND_MOVE_IMAGE = 'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%208.26.33%20p.m..png';

// Función para precargar todas las imágenes críticas
export const preloadImages = () => {
  const imagesToPreload = [...CAROUSEL_IMAGES, BREATHE_AND_MOVE_IMAGE];
  
  // Precargar todas las imágenes
  imagesToPreload.forEach(imageUrl => {
    Image.prefetch(imageUrl);
  });
};

// Función para precargar una imagen específica
export const prefetchImage = (url: string) => {
  return Image.prefetch(url);
};

// Hook para precargar imágenes cuando el componente se monta
import { useEffect } from 'react';

export const useImagePreloader = (imageUrls: string[]) => {
  useEffect(() => {
    imageUrls.forEach(url => {
      Image.prefetch(url);
    });
  }, [imageUrls]);
};