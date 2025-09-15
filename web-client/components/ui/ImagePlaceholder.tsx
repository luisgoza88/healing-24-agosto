export function ImagePlaceholder({ 
  text, 
  className = "",
  bgColor = "bg-gradient-to-br from-emerald-400 to-teal-500"
}: { 
  text: string
  className?: string
  bgColor?: string 
}) {
  return (
    <div className={`${bgColor} ${className} flex items-center justify-center`}>
      <div className="text-center text-white">
        <div className="text-4xl mb-2">🌿</div>
        <p className="text-lg font-semibold">{text}</p>
      </div>
    </div>
  )
}