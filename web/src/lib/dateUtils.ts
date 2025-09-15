/**
 * Utilidades para manejar fechas correctamente evitando problemas de zona horaria
 */

/**
 * Formatea una fecha string (YYYY-MM-DD) a formato legible
 * Evita problemas de zona horaria al crear la fecha con componentes locales
 */
export function formatDateString(dateString: string, options?: Intl.DateTimeFormatOptions) {
  // Parse the date components to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return date.toLocaleDateString('es-ES', options || defaultOptions)
}

/**
 * Formatea una fecha string a formato corto (DD/MM/YYYY)
 */
export function formatDateShort(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Compara si una fecha string es futura
 */
export function isFutureDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date >= today
}

/**
 * Compara si una fecha string es pasada
 */
export function isPastDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return date < today
}

/**
 * Calcula la edad a partir de una fecha de nacimiento
 */
export function calculateAge(birthDateString: string): number {
  const [year, month, day] = birthDateString.split('-').map(Number)
  const birthDate = new Date(year, month - 1, day)
  const today = new Date()
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}