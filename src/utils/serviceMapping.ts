// Mapeo entre los IDs de constantes y los IDs reales de Supabase
export const SERVICE_ID_MAPPING: Record<string, string> = {
  'medicina-funcional': '1d1e6c10-4844-4e87-bac3-d6e7992a8e84',
  'medicina-estetica': '7d87aa17-39f0-4958-a1b3-e38865386f87',
  'wellness-integral': 'a8d683b5-a196-4f4f-8260-992fe149ee6b',
  'breathe-and-move': '6e46036b-ed0a-4459-8ca3-a1c3dafdaf12',
  'medicina-regenerativa': '0d6ccb17-bab0-4dc2-b9f6-b2a304ca7c23',
  'faciales': '9d35276b-41f2-411b-a592-3dd531931c51',
  'masajes': '38e81852-e43c-4847-9d9c-8a3750138a51',
  'otros': 'temp-otros'
};

// Función para obtener el ID real de Supabase
export const getRealServiceId = (constantId: string): string => {
  return SERVICE_ID_MAPPING[constantId] || constantId;
};

// Mapeo inverso: de UUID a ID de constante
export const SERVICE_UUID_TO_ID: Record<string, string> = Object.entries(SERVICE_ID_MAPPING).reduce(
  (acc, [key, value]) => {
    if (!value.startsWith('temp-')) {
      acc[value] = key;
    }
    return acc;
  }, 
  {} as Record<string, string>
);

// Función para obtener el ID de constante desde el UUID
export const getServiceConstantId = (uuid: string): string => {
  return SERVICE_UUID_TO_ID[uuid] || 'otros';
};