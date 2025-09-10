import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ 
  message = 'Ocurrió un error al cargar los datos', 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <p className="text-lg text-gray-700">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}