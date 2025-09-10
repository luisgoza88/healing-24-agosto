export default function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-3">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}