export default function SimplePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #10b981, #14b8a6)',
      padding: '2rem',
      color: 'white'
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        marginBottom: '2rem'
      }}>
        Página de Prueba Simple
      </h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        <div style={{
          background: 'white',
          color: '#111',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Card 1</h2>
          <p>Esta es una prueba con estilos inline</p>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Card 2</h2>
          <p>Card con gradiente naranja-rojo</p>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Card 3</h2>
          <p>Card con gradiente púrpura</p>
        </div>
      </div>
    </div>
  )
}