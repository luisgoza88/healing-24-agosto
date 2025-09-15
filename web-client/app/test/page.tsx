export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-white mb-8">Test de Estilos</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Card 1</h2>
            <p className="text-gray-600">Prueba de card con gradientes y sombras</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-2xl p-6 text-white">
            <div className="w-20 h-20 bg-white/30 backdrop-blur rounded-full mb-4"></div>
            <h2 className="text-2xl font-semibold mb-2">Card 2</h2>
            <p className="text-white/90">Card con fondo gradiente</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl shadow-2xl p-6 text-white">
            <div className="w-20 h-20 bg-white/30 backdrop-blur rounded-full mb-4"></div>
            <h2 className="text-2xl font-semibold mb-2">Card 3</h2>
            <p className="text-white/90">Más estilos coloridos</p>
          </div>
        </div>
        
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-white/20">
          <h3 className="text-3xl font-bold text-white mb-4">Glassmorphism Test</h3>
          <p className="text-white/80 text-lg">Este es un ejemplo de glassmorphism con backdrop blur</p>
          
          <div className="mt-6 flex gap-4">
            <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-full hover:scale-105 transform transition-all shadow-lg">
              Botón 1
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-full hover:scale-105 transform transition-all shadow-lg">
              Botón 2
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}