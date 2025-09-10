import { FileX } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ 
  message = 'No se encontraron resultados', 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <FileX className="h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg text-gray-600">{message}</p>
      {action && (
        <button 
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}