import Link from 'next/link'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-emerald-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold">Healing Forest</span>
            </Link>
            <p className="mt-4 text-emerald-100">
              Tu centro de bienestar integral donde cuerpo, mente y espíritu se encuentran en perfecta armonía.
            </p>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Nosotros</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/about" className="text-emerald-200 hover:text-white transition-colors">
                    Sobre Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/team" className="text-emerald-200 hover:text-white transition-colors">
                    Nuestro Equipo
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-emerald-200 hover:text-white transition-colors">
                    Carreras
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Servicios</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/services" className="text-emerald-200 hover:text-white transition-colors">
                    Consultas
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="text-emerald-200 hover:text-white transition-colors">
                    Clases
                  </Link>
                </li>
                <li>
                  <Link href="/therapies" className="text-emerald-200 hover:text-white transition-colors">
                    Terapias
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Soporte</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/contact" className="text-emerald-200 hover:text-white transition-colors">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-emerald-200 hover:text-white transition-colors">
                    Preguntas Frecuentes
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-emerald-200 hover:text-white transition-colors">
                    Centro de Ayuda
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/privacy" className="text-emerald-200 hover:text-white transition-colors">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-emerald-200 hover:text-white transition-colors">
                    Términos
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-emerald-200 hover:text-white transition-colors">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-emerald-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-emerald-200">
              &copy; 2024 Healing Forest. Todos los derechos reservados.
            </p>
            <p className="flex items-center text-sm text-emerald-200">
              Hecho con <Heart className="mx-1 h-4 w-4 text-red-400 fill-current" /> en Colombia
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}