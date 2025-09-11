"use client";

import { useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Loader2 } from "lucide-react";

export default function TempResetPage() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleDirectReset = async () => {
    setLoading(true);
    setMessage("");
    
    const supabase = createClient();
    
    try {
      // Hacer login con el service role key para poder actualizar
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'lmg880@gmail.com',
        password: 'temporal123' // Contraseña temporal
      });
      
      if (error && error.message.includes('Invalid login credentials')) {
        // Si falla, intentamos crear una sesión temporal
        setMessage("Por favor, ve a http://localhost:3001/auth/reset y sigue las instrucciones");
      } else {
        // Si funciona, actualizamos la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (updateError) {
          setMessage("Error: " + updateError.message);
        } else {
          setMessage("¡Contraseña actualizada! Ya puedes hacer login con tu nueva contraseña");
        }
      }
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Reset Temporal de Contraseña</h2>
        <p className="text-gray-600 mb-6">
          Email: <strong>lmg880@gmail.com</strong>
        </p>
        
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
          
          <button
            onClick={handleDirectReset}
            disabled={loading || !newPassword}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Cambiar Contraseña"}
          </button>
          
          {message && (
            <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-100' : 'bg-green-100'}`}>
              {message}
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            <strong>Opción alternativa:</strong> Si no funciona, puedes:
          </p>
          <ol className="text-sm text-gray-600 list-decimal list-inside mt-2">
            <li>Abrir la app móvil</li>
            <li>Cerrar sesión</li>
            <li>Usar "¿Olvidaste tu contraseña?"</li>
            <li>Te llegará un email para resetear</li>
          </ol>
        </div>
      </div>
    </div>
  );
}