// Sub-servicios para cada servicio principal
// Estos datos deben coincidir exactamente con los de la app móvil

export const SERVICE_ITEMS = {
  'Medicina Funcional': [
    { name: 'Consulta funcional – primera vez', duration: 75, price: 300000 },
    { name: 'Consulta funcional – seguimiento', duration: 30, price: 150000 },
    { name: 'Consulta péptidos', duration: 60, price: 200000 },
    { name: 'Consulta células madre', duration: 60, price: 200000 },
  ],
  'Medicina Estética': [
    { name: 'Consulta medicina estética valoración', duration: 60, price: 150000 },
    { name: 'Procedimientos estéticos', duration: 60, price: 750000, priceNote: 'desde' },
  ],
  'Medicina Regenerativa & Longevidad': [
    { name: 'Baño helado', duration: 30, price: 80000 },
    { name: 'Sauna infrarrojo', duration: 45, price: 130000 },
    { name: 'Baño helado + sauna infrarrojo', duration: 60, price: 190000 },
    { name: 'Cámara hiperbárica', duration: 60, price: 180000 },
  ],
  'DRIPS - Sueroterapia': [
    { name: 'Vitaminas - IV Drips', duration: 60, price: 265000, priceNote: 'desde' },
    { name: 'NAD 125 mg', duration: 90, price: 400000 },
    { name: 'NAD 500 mg', duration: 180, price: 1500000 },
    { name: 'NAD 1000 mg', duration: 240, price: 2300000 },
    { name: 'Ozonoterapia – suero ozonizado', duration: 60, price: 300000 },
    { name: 'Ozonoterapia – autohemoterapia mayor', duration: 60, price: 350000 },
  ],
  'Faciales': [
    { name: 'Clean Facial', duration: 75, price: 280000 },
    { name: 'Glow Facial', duration: 90, price: 380000 },
    { name: 'Anti-Age Facial', duration: 90, price: 380000 },
    { name: 'Anti-Acné Facial', duration: 90, price: 380000 },
    { name: 'Lymph Facial', duration: 90, price: 380000 },
  ],
  'Masajes': [
    { name: 'Drenaje linfático', duration: 75, price: 190000 },
    { name: 'Relajante', duration: 75, price: 200000 },
  ],
  'Wellness Integral': [],
  'Breathe & Move': [] // Este se maneja diferente con el sistema de clases
}

// También exportar por ID para facilitar el acceso
export const SERVICE_ITEMS_BY_ID = {
  'medicina-funcional': SERVICE_ITEMS['Medicina Funcional'],
  'medicina-estetica': SERVICE_ITEMS['Medicina Estética'],
  'medicina-regenerativa': SERVICE_ITEMS['Medicina Regenerativa & Longevidad'],
  'drips': SERVICE_ITEMS['DRIPS - Sueroterapia'],
  'faciales': SERVICE_ITEMS['Faciales'],
  'masajes': SERVICE_ITEMS['Masajes'],
  'wellness-integral': SERVICE_ITEMS['Wellness Integral'],
  'breathe-move': SERVICE_ITEMS['Breathe & Move']
}