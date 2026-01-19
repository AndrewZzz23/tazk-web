import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Zap, CheckCircle2, Users, Calendar, BarChart3, ArrowRight } from 'lucide-react'
import TermsOfService from './components/TermsOfService'
import PrivacyPolicy from './components/PrivacyPolicy'

// Partículas flotantes animadas
const FloatingParticles = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: Math.random() * 12 + 6, // Más grandes: 6-18px
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 8, // Más rápidas
    delay: Math.random() * 3,
    moveX: Math.random() * 60 - 30, // Movimiento horizontal aleatorio
    type: Math.random() > 0.5 ? 'circle' : 'ring', // Variedad de formas
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${
            p.type === 'circle'
              ? 'bg-gradient-to-br from-yellow-300/40 to-orange-400/30'
              : 'border-2 border-white/20 bg-transparent'
          }`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            ['--move-x' as string]: `${p.moveX}px`,
            boxShadow: p.type === 'circle' ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// Tarjeta de feature animada
const FeatureCard = ({ icon: Icon, title, delay }: { icon: any; title: string; delay: number }) => (
  <div
    className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-white font-medium text-sm">{title}</span>
  </div>
)

// Mockup de tareas animado
const TaskMockup = () => {
  const tasks = [
    { done: true, text: 'Diseñar interfaz', color: 'bg-emerald-400' },
    { done: true, text: 'Revisar código', color: 'bg-blue-400' },
    { done: false, text: 'Entregar proyecto', color: 'bg-yellow-400' },
    { done: false, text: 'Pruebas finales', color: 'bg-purple-400' },
  ]

  return (
    <div className="relative h-full">
      {/* Sombras de profundidad */}
      <div className="absolute inset-0 bg-white/10 rounded-2xl transform rotate-2 translate-x-2 translate-y-2" />
      <div className="absolute inset-0 bg-white/20 rounded-2xl transform -rotate-1 translate-x-1 translate-y-1" />

      {/* Tarjeta principal */}
      <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/50 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-gray-400 font-medium">Mis Tareas</span>
        </div>

        <div className="space-y-3 flex-1">
          {tasks.map((task, i) => (
            <div
              key={i}
              className="flex items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: `${800 + i * 150}ms` }}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                task.done
                  ? `${task.color} border-transparent`
                  : 'border-gray-300'
              }`}>
                {task.done && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm truncate ${
                task.done
                  ? 'text-gray-400 line-through'
                  : 'text-gray-700 font-medium'
              }`}>
                {task.text}
              </span>
              <div className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${task.color}`} />
            </div>
          ))}
        </div>

        {/* Barra de progreso */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Progreso del día</span>
            <span className="text-xs font-bold text-yellow-500">50%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-progress"
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Mockup de equipo/colaboración
const TeamMockup = () => {
  const members = [
    { name: 'Ana', color: 'bg-pink-400', online: true },
    { name: 'Carlos', color: 'bg-blue-400', online: true },
    { name: 'María', color: 'bg-purple-400', online: false },
    { name: 'Juan', color: 'bg-emerald-400', online: true },
  ]

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-white/10 rounded-2xl transform -rotate-2 translate-x-1 translate-y-1" />

      <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/50 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400 font-medium">Mi Equipo</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">3 online</span>
        </div>

        {/* Avatares apilados */}
        <div className="flex items-center mb-4">
          <div className="flex -space-x-3">
            {members.map((member, i) => (
              <div
                key={i}
                className={`relative w-10 h-10 ${member.color} rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white animate-fade-in-up shadow-lg`}
                style={{ animationDelay: `${1200 + i * 150}ms`, zIndex: 4 - i }}
              >
                {member.name[0]}
                {member.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                )}
              </div>
            ))}
          </div>
          <span className="ml-3 text-xs text-gray-500">+12 más</span>
        </div>

        {/* Actividad reciente */}
        <div className="space-y-2.5 flex-1 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Actividad reciente</p>
          <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '1600ms' }}>
            <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">Ana completó "Diseño UI"</span>
          </div>
          <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '1750ms' }}>
            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">Carlos añadió comentario</span>
          </div>
          <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '1900ms' }}>
            <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">Nueva tarea asignada</span>
          </div>
        </div>

        {/* Footer stats */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">24</p>
            <p className="text-[10px] text-gray-400">Tareas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-500">18</p>
            <p className="text-[10px] text-gray-400">Completadas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-yellow-500">6</p>
            <p className="text-[10px] text-gray-400">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mockup de calendario
const CalendarMockup = () => {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const dates = [13, 14, 15, 16, 17, 18, 19]
  const today = 16
  const hasTask = [14, 16, 17, 19]

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-white/10 rounded-2xl transform rotate-2 translate-x-1 translate-y-1" />

      <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/50 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400 font-medium">Enero 2026</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 cursor-pointer transition-colors">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 cursor-pointer transition-colors">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Mini calendario */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {days.map((day, i) => (
            <div key={i} className="text-center text-[10px] text-gray-400 font-medium py-1">
              {day}
            </div>
          ))}
          {dates.map((date, i) => (
            <div
              key={i}
              className={`relative text-center text-xs py-2 rounded-lg animate-fade-in-up cursor-pointer transition-all ${
                date === today
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ animationDelay: `${1400 + i * 80}ms` }}
            >
              {date}
              {hasTask.includes(date) && date !== today && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Próximas tareas */}
        <div className="flex-1 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-3">Próximos eventos</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '1900ms' }}>
              <div className="w-1 h-10 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Entregar propuesta</p>
                <p className="text-[10px] text-gray-400">Hoy, 3:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '2050ms' }}>
              <div className="w-1 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Reunión de equipo</p>
                <p className="text-[10px] text-gray-400">Mañana, 10:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Login() {
  const [isLoading, setIsLoading] = useState<'google' | 'microsoft' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoading('google')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      console.error('Error Google:', error)
      setIsLoading(null)
    }
  }

  const handleMicrosoftLogin = async () => {
    setIsLoading('microsoft')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid email profile',
        queryParams: {
          prompt: 'select_account',
        }
      }
    })
    if (error) {
      console.error('Error Microsoft:', error)
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Estilos de animación */}
      <style>{`
        @keyframes float-particle {
          0% {
            transform: translateY(0) translateX(0) scale(1) rotate(0deg);
            opacity: 0.4;
          }
          25% {
            transform: translateY(-30px) translateX(var(--move-x, 20px)) scale(1.2) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-50px) translateX(calc(var(--move-x, 20px) * -0.5)) scale(0.9) rotate(180deg);
            opacity: 0.6;
          }
          75% {
            transform: translateY(-25px) translateX(calc(var(--move-x, 20px) * 0.8)) scale(1.1) rotate(270deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(0) translateX(0) scale(1) rotate(360deg);
            opacity: 0.4;
          }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          from { width: 0; }
          to { width: 67%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-progress {
          animation: progress 1.5s ease-out 1s forwards;
          width: 0;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
      `}</style>

      {/* Lado izquierdo - Hero con gradiente */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Fondo con gradiente animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 animate-gradient" />

        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Partículas */}
        <FloatingParticles />

        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-orange-600/30 rounded-full blur-3xl" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full h-full py-8">
          {/* Logo y título */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">Tazk</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Organiza tu trabajo,<br />
              <span className="text-neutral-900">conquista tus metas</span>
            </h1>

            <p className="text-white/80 text-lg max-w-md mb-8">
              La forma más inteligente de gestionar tareas y colaborar con tu equipo en tiempo real.
            </p>
          </div>

          {/* Features - 4 en línea (xl) o 2x2 (lg) */}
          <div className={`grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <FeatureCard icon={CheckCircle2} title="Tareas ilimitadas" delay={400} />
            <FeatureCard icon={Users} title="Colaboración" delay={500} />
            <FeatureCard icon={Calendar} title="Calendario" delay={600} />
            <FeatureCard icon={BarChart3} title="Métricas" delay={700} />
          </div>

          {/* Mockups - 2 tarjetas en lg, 3 en xl */}
          <div className={`grid grid-cols-2 xl:grid-cols-3 gap-5 w-full transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <TaskMockup />
            <TeamMockup />
            <div className="hidden xl:block">
              <CalendarMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - Login */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col">
        {/* Header móvil */}
        <div className="lg:hidden bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 px-6 py-10 relative overflow-hidden">
          <FloatingParticles />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">Tazk</span>
              <p className="text-white/80 text-sm">Gestión de tareas</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 bg-neutral-950">
          <div className={`max-w-sm mx-auto w-full transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Título */}
            <div className="text-center lg:text-left mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">
                Bienvenido
              </h2>
              <p className="text-neutral-400">
                Inicia sesión para continuar
              </p>
            </div>

            {/* Botones de login */}
            <div className="space-y-4">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading !== null}
                className="group relative w-full bg-white hover:bg-gray-50 text-neutral-900 font-semibold rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-white/10 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none overflow-hidden"
              >
                {isLoading === 'google' ? (
                  <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
                      <path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285f4"/>
                      <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34a853"/>
                      <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#fbbc04"/>
                      <path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#ea4335"/>
                    </svg>
                    <span>Continuar con Google</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all absolute right-6" />
                  </>
                )}
              </button>

              {/* Microsoft */}
              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading !== null}
                className="group relative w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-neutral-800/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none border border-neutral-700 overflow-hidden"
              >
                {isLoading === 'microsoft' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#F25022" d="M1 1h10v10H1z"/>
                      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                      <path fill="#FFB900" d="M13 13h10v10H13z"/>
                    </svg>
                    <span>Continuar con Microsoft</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all absolute right-6" />
                  </>
                )}
              </button>
            </div>

            {/* Separador */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-neutral-950 px-4 text-sm text-neutral-500">
                  Autenticación segura
                </span>
              </div>
            </div>

            {/* Info de seguridad */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-neutral-300 text-sm font-medium">Conexión encriptada</p>
                  <p className="text-neutral-500 text-xs mt-0.5">Tus datos están protegidos con encriptación de extremo a extremo</p>
                </div>
              </div>
            </div>

            {/* Términos */}
            <p className="mt-8 text-center text-xs text-neutral-500">
              Al continuar, aceptas nuestros{' '}
              <button
                onClick={() => setShowTerms(true)}
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Terminos de Servicio
              </button>{' '}
              y{' '}
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Politica de Privacidad
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <p className="text-center text-xs text-neutral-600">
            Tazk &copy; {new Date().getFullYear()} - Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Modales */}
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  )
}

export default Login
