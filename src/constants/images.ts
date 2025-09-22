// URLs públicas permanentes de las imágenes (sin tokens de expiración)
// Estas URLs son más estables y se cachean mejor

export const STATIC_IMAGES = {
  carousel: [
    'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.50.48%20p.m..png',
    'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.51.24%20p.m..png',
    'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%207.52.40%20p.m..png'
  ],
  breatheAndMove: 'https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/FOTOS%20DESLIZABLES/Captura%20de%20pantalla%202025-09-21%20a%20la(s)%208.26.33%20p.m..png'
};

// Función para obtener URL pública de una imagen de Supabase
export const getPublicImageUrl = (path: string) => {
  return `https://vgwyhegpymqbljqtskra.supabase.co/storage/v1/object/public/${path}`;
};