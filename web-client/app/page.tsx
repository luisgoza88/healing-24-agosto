import Link from 'next/link'
import { ArrowRight, Star, Users, Calendar, Award, Check, PlayCircle, MessageCircle, Clock, Shield, Heart, Activity, Sparkles } from 'lucide-react'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

export default function Home() {
  return (
    <>
      {/* Hero Section with App Mockup */}
      <section className="relative min-h-[700px] bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                La Salud es Riqueza,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                  Confía en Nuestro Cuidado
                </span>
              </h1>
              <p className="mt-6 text-xl text-emerald-100 max-w-2xl mx-auto lg:mx-0">
                Únete a miles de personas que han transformado su bienestar con nuestro enfoque integral de salud
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-lg font-semibold text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  Comenzar Ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <button className="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-all duration-200">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Ver Demo
                </button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">15k+</p>
                  <p className="text-sm text-emerald-200">Pacientes Activos</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">98%</p>
                  <p className="text-sm text-emerald-200">Satisfacción</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-3xl font-bold text-white">24/7</p>
                  <p className="text-sm text-emerald-200">Soporte</p>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="relative mx-auto max-w-md lg:mx-0">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-[3rem] blur-2xl opacity-75"></div>
              <div className="relative">
                <div className="mx-auto w-full max-w-sm">
                  <div className="relative rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl">
                    <div className="aspect-[9/19] overflow-hidden rounded-[2rem] bg-white">
                      {/* Phone Screen Content */}
                      <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold text-lg">Healing Forest</span>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-md">
                          <p className="text-sm text-gray-600 mb-1">Próxima cita</p>
                          <p className="font-semibold text-gray-900">Dra. María González</p>
                          <p className="text-sm text-emerald-600 font-medium">Hoy, 3:00 PM</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 shadow-md">
                          <p className="text-sm text-gray-600 mb-1">Clase de Yoga</p>
                          <p className="font-semibold text-gray-900">Vinyasa Flow</p>
                          <p className="text-sm text-purple-600 font-medium">Mañana, 7:00 AM</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl p-4 text-center shadow-md">
                            <Activity className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-emerald-900">92</p>
                            <p className="text-xs text-emerald-700">Ritmo Cardíaco</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-4 text-center shadow-md">
                            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-900">8.5</p>
                            <p className="text-xs text-blue-700">Horas Sueño</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-6">
                          <button className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-shadow">
                            <Calendar className="h-6 w-6 text-emerald-600 mx-auto" />
                            <p className="text-xs mt-1 text-gray-600">Citas</p>
                          </button>
                          <button className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-shadow">
                            <Heart className="h-6 w-6 text-red-500 mx-auto" />
                            <p className="text-xs mt-1 text-gray-600">Salud</p>
                          </button>
                          <button className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-shadow">
                            <MessageCircle className="h-6 w-6 text-blue-600 mx-auto" />
                            <p className="text-xs mt-1 text-gray-600">Chat</p>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Phone Notch */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-40 h-6 bg-gray-900 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section with Cards */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Sobre <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Healing Forest</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Tu centro de bienestar integral que te empodera para tomar el control de tu salud con un enfoque holístico y personalizado
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-100 rounded-full blur-2xl group-hover:bg-emerald-200 transition-colors"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Cuidado Personalizado
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Planes de tratamiento adaptados a tus necesidades únicas y objetivos de salud específicos
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-100 rounded-full blur-2xl group-hover:bg-purple-200 transition-colors"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Equipo Experto
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Profesionales certificados con años de experiencia en medicina integrativa y holística
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 rounded-full blur-2xl group-hover:bg-orange-200 transition-colors"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Resultados Comprobados
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Miles de pacientes han transformado su vida con nuestro enfoque integral de salud
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Self Assessment Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Elige tu Evaluación Personal
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Descubre el camino ideal para tu bienestar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group cursor-pointer">
              <div className="relative mb-6 mx-auto w-40 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <span className="text-6xl">💪</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 right-4 bg-white rounded-full p-2 shadow-lg">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Fitness</h3>
              <p className="text-gray-600 max-w-xs mx-auto">Evaluación física completa y plan de ejercicios personalizado</p>
            </div>

            <div className="text-center group cursor-pointer">
              <div className="relative mb-6 mx-auto w-40 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <span className="text-6xl">🧘‍♀️</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 right-4 bg-white rounded-full p-2 shadow-lg">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Ansiedad</h3>
              <p className="text-gray-600 max-w-xs mx-auto">Test de bienestar mental y técnicas de manejo del estrés</p>
            </div>

            <div className="text-center group cursor-pointer">
              <div className="relative mb-6 mx-auto w-40 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-6xl">😊</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 right-4 bg-white rounded-full p-2 shadow-lg">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Depresión</h3>
              <p className="text-gray-600 max-w-xs mx-auto">Evaluación emocional y apoyo terapéutico integral</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/assessment"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Comenzar Evaluación
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Online Services */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Ofrecemos Servicios de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Consulta Online</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Accede a nuestros especialistas desde la comodidad de tu hogar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Chat en Vivo</h3>
              <p className="text-gray-600 mb-6">
                Conecta instantáneamente con profesionales de salud para consultas rápidas
              </p>
              <Link href="/chat" className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center justify-center">
                Iniciar Chat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="relative bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 text-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Reserva de Citas</h3>
                <p className="text-emerald-50 mb-6">
                  Agenda consultas virtuales con nuestros especialistas en horarios flexibles
                </p>
                <Link
                  href="/booking"
                  className="inline-flex items-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  Agendar Ahora
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Soporte 24/7</h3>
              <p className="text-gray-600 mb-6">
                Asistencia continua para emergencias y seguimiento de tratamientos
              </p>
              <Link href="/support" className="text-purple-600 font-medium hover:text-purple-700 flex items-center justify-center">
                Obtener Ayuda
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Fitness CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900"></div>
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-4xl font-bold mb-6 sm:text-5xl">
                Comienza tu Entrenamiento Avanzado para<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                  Mejorar tu Bienestar
                </span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8">
                Programas personalizados de fitness y nutrición diseñados por expertos para transformar tu vida
              </p>
              
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <h3 className="text-3xl font-bold text-emerald-300 mb-1">45+</h3>
                  <p className="text-emerald-100 text-sm">Clases Semanales</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <h3 className="text-3xl font-bold text-emerald-300 mb-1">12</h3>
                  <p className="text-emerald-100 text-sm">Entrenadores</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <h3 className="text-3xl font-bold text-emerald-300 mb-1">100%</h3>
                  <p className="text-emerald-100 text-sm">Personalizado</p>
                </div>
              </div>

              <Link
                href="/fitness"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-lg font-semibold text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                Explorar Programas
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-3xl opacity-30"></div>
              <div className="relative">
                <ImagePlaceholder 
                  text="Yoga & Fitness" 
                  className="rounded-3xl h-[400px] shadow-2xl"
                  bgColor="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <ImagePlaceholder 
                  text="Terapia Holística" 
                  className="h-full"
                  bgColor="bg-gradient-to-br from-purple-400 to-pink-400"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 max-w-xs">
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="font-medium text-gray-900">
                  "Mi vida cambió completamente con el enfoque integral de Healing Forest"
                </p>
                <p className="text-sm text-emerald-600 mt-2">- Ana María, Paciente</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6 sm:text-5xl">
                Descubre los Beneficios de la<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  Terapia para tu Cuerpo
                </span><br />
                con Nuestro Equipo
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Nuestro enfoque único combina lo mejor de la medicina tradicional con terapias alternativas comprobadas para tu bienestar integral
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="ml-3 text-gray-700">Reducción del estrés y ansiedad en un 85%</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="ml-3 text-gray-700">Mejora en la calidad del sueño desde la primera semana</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="ml-3 text-gray-700">Incremento en energía y vitalidad diaria</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="ml-3 text-gray-700">Fortalecimiento del sistema inmunológico</span>
                </li>
              </ul>
              
              <Link
                href="/therapies"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Conocer Más
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Specialists */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Obtén Tratamiento de Nuestros 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600"> Especialistas</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Profesionales certificados comprometidos con tu bienestar integral
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/5] relative">
                <ImagePlaceholder 
                  text="Dr. Miguel Ramírez" 
                  className="h-full"
                  bgColor="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-xl font-semibold text-white">Dr. Miguel Ramírez</h3>
                  <p className="text-emerald-100">Medicina Funcional</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">(4.9)</span>
                </div>
                <p className="text-gray-600 mb-4">
                  15+ años de experiencia en medicina integrativa y nutrición funcional
                </p>
                <Link
                  href="/professionals/dr-ramirez"
                  className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center"
                >
                  Ver Perfil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="group bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/5] relative">
                <ImagePlaceholder 
                  text="Dra. Laura Sánchez" 
                  className="h-full"
                  bgColor="bg-gradient-to-br from-purple-400 to-pink-400"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-xl font-semibold text-white">Dra. Laura Sánchez</h3>
                  <p className="text-purple-100">Psicología Integrativa</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">(5.0)</span>
                </div>
                <p className="text-gray-600 mb-4">
                  Especialista en terapias holísticas y manejo del estrés
                </p>
                <Link
                  href="/professionals/dra-sanchez"
                  className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center"
                >
                  Ver Perfil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="group bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/5] relative">
                <ImagePlaceholder 
                  text="Dra. Carolina Torres" 
                  className="h-full"
                  bgColor="bg-gradient-to-br from-orange-400 to-red-400"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-xl font-semibold text-white">Dra. Carolina Torres</h3>
                  <p className="text-orange-100">Medicina Estética</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">(4.8)</span>
                </div>
                <p className="text-gray-600 mb-4">
                  Experta en tratamientos no invasivos y rejuvenecimiento natural
                </p>
                <Link
                  href="/professionals/dra-torres"
                  className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center"
                >
                  Ver Perfil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/professionals"
              className="inline-flex items-center text-lg font-medium text-emerald-600 hover:text-emerald-700"
            >
              Ver Todos los Especialistas
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-4xl font-bold mb-6 sm:text-5xl">
                Descarga nuestra App para<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                  Cuidar tu Salud
                </span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8">
                Lleva tu bienestar en el bolsillo con nuestra aplicación móvil intuitiva y poderosa
              </p>
              
              <ul className="space-y-4 mb-10">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="ml-3 text-emerald-50">Agenda citas con un solo toque</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="ml-3 text-emerald-50">Recordatorios inteligentes de medicamentos</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="ml-3 text-emerald-50">Historial médico completo y seguro</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="ml-3 text-emerald-50">Chat directo con especialistas 24/7</span>
                </li>
              </ul>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl bg-black/90 backdrop-blur-sm px-6 py-3 shadow-xl hover:bg-black transition-colors"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="white">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-80">Descarga en</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </Link>
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl bg-black/90 backdrop-blur-sm px-6 py-3 shadow-xl hover:bg-black transition-colors"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="white">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-80">Disponible en</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </Link>
              </div>
            </div>
            
            <div className="relative mx-auto">
              <div className="absolute -inset-8 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-3xl opacity-30"></div>
              <div className="relative">
                <div className="mx-auto max-w-sm">
                  <div className="aspect-[9/19] rounded-[3rem] bg-gray-900 p-3 shadow-2xl">
                    <div className="h-full rounded-[2.5rem] bg-white overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold">Healing Forest</p>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-600">Próxima cita</p>
                            <span className="text-xs text-emerald-600 font-medium">En 2 horas</span>
                          </div>
                          <p className="font-semibold text-gray-900">Dra. María González</p>
                          <p className="text-sm text-gray-600">Medicina Funcional</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100">
                            <Calendar className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 text-center">Calendario</p>
                          </div>
                          <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100">
                            <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 text-center">Chat</p>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Tu progreso hoy</p>
                              <p className="text-2xl font-bold text-gray-900">85%</p>
                            </div>
                            <div className="w-16 h-16">
                              <svg className="transform -rotate-90 w-16 h-16">
                                <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                                <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="175.93" strokeDashoffset="26.39" strokeLinecap="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Nuestros Clientes Valoran el <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Éxito</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              es una Experiencia de Vida Feliz
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 shadow-xl">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "Increíble experiencia. El equipo de Healing Forest cambió mi vida por completo. 
                Ahora tengo más energía y me siento mejor que nunca."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <span className="text-white font-semibold">MS</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">María Silva</p>
                  <p className="text-sm text-gray-600">Paciente desde 2022</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 shadow-xl">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "Las clases de yoga y meditación me ayudaron a manejar mi ansiedad. 
                Los instructores son excelentes y el ambiente es muy acogedor."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-semibold">JR</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Juan Rodríguez</p>
                  <p className="text-sm text-gray-600">Miembro activo</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl p-8 shadow-xl">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "El enfoque integral de salud es exactamente lo que necesitaba. 
                Excelente atención y resultados visibles desde el primer mes."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-white font-semibold">CP</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Carmen Pérez</p>
                  <p className="text-sm text-gray-600">Cliente satisfecha</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600"></div>
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4 sm:text-5xl">
            Mantente en Contacto
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Únete a nuestra comunidad y recibe consejos de salud, promociones exclusivas y más
          </p>
          <form className="mx-auto max-w-md flex gap-4">
            <input
              type="email"
              placeholder="Tu correo electrónico"
              className="flex-1 rounded-full px-6 py-3 text-gray-900 placeholder-gray-500 shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30"
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-emerald-800 to-teal-800 px-8 py-3 font-semibold text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Suscribir
            </button>
          </form>
        </div>
      </section>
    </>
  )
}