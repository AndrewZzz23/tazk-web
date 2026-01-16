import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ZapIcon,
  ListIcon,
  KanbanIcon,
  CalendarIcon,
  ChartIcon,
  PaletteIcon,
  UsersIcon,
  BellIcon,
  CheckIcon
} from './iu/AnimatedIcons'
import { User, Users, Plus, Sparkles, ArrowRight, Rocket } from 'lucide-react'

interface OnboardingProps {
  type: 'user' | 'team'
  teamName?: string
  onComplete: () => void
  onSkip?: () => void
}

interface Step {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  content: React.ReactNode
}

function Onboarding({ type, teamName, onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onComplete, 300)
  }

  const handleSkip = () => {
    setIsVisible(false)
    setTimeout(onSkip || onComplete, 300)
  }

  const userSteps: Step[] = [
    {
      id: 'welcome',
      title: '¡Bienvenido a Tazk!',
      description: 'Tu nuevo gestor de tareas inteligente',
      icon: <ZapIcon size={48} />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/30"
          >
            <ZapIcon size={48} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a Tazk!</h2>
            <p className="text-neutral-400">
              Organiza tus tareas de manera eficiente y colabora con tu equipo.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-yellow-400"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Te guiaremos paso a paso</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>
      )
    },
    {
      id: 'views',
      title: 'Múltiples vistas',
      description: 'Elige cómo ver tus tareas',
      icon: <ListIcon size={32} />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Visualiza tus tareas de la forma que más te convenga
          </p>
          <div className="grid gap-4">
            {[
              { icon: <ListIcon size={24} />, name: 'Lista', desc: 'Vista clásica ordenada', color: 'from-blue-500 to-blue-600' },
              { icon: <KanbanIcon size={24} />, name: 'Kanban', desc: 'Tablero por estados', color: 'from-purple-500 to-purple-600' },
              { icon: <CalendarIcon size={24} />, name: 'Calendario', desc: 'Organiza por fechas', color: 'from-green-500 to-green-600' },
            ].map((view, i) => (
              <motion.div
                key={view.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${view.color} flex items-center justify-center text-white shadow-lg`}>
                  {view.icon}
                </div>
                <div>
                  <h4 className="text-white font-medium">{view.name}</h4>
                  <p className="text-neutral-500 text-sm">{view.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'statuses',
      title: 'Estados personalizados',
      description: 'Crea tu flujo de trabajo',
      icon: <PaletteIcon size={32} />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Personaliza los estados de tus tareas según tu forma de trabajar
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Pendiente', color: '#6b7280' },
              { name: 'En progreso', color: '#3b82f6' },
              { name: 'En revisión', color: '#f59e0b' },
              { name: 'Completada', color: '#22c55e' },
            ].map((status, i) => (
              <motion.div
                key={status.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: `${status.color}20`, border: `1px solid ${status.color}40` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-white text-sm">{status.name}</span>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-neutral-500 text-sm mt-4"
          >
            Puedes crear, editar y reorganizar los estados desde el menú de herramientas
          </motion.p>
        </div>
      )
    },
    {
      id: 'workspaces',
      title: 'Espacios de trabajo',
      description: 'Personal y equipos',
      icon: <UsersIcon size={32} />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Organiza tus tareas en diferentes espacios
          </p>
          <div className="grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 bg-gradient-to-br from-neutral-800 to-neutral-800/50 rounded-2xl border border-neutral-700/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-900" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Tareas Personales</h4>
                  <p className="text-neutral-500 text-xs">Solo tú</p>
                </div>
              </div>
              <p className="text-neutral-400 text-sm">
                Tu espacio privado para gestionar tus tareas personales
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-5 bg-gradient-to-br from-neutral-800 to-neutral-800/50 rounded-2xl border border-neutral-700/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Equipos</h4>
                  <p className="text-neutral-500 text-xs">Colaboración</p>
                </div>
              </div>
              <p className="text-neutral-400 text-sm">
                Crea equipos, invita miembros y colabora en tiempo real
              </p>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      id: 'tools',
      title: 'Herramientas',
      description: 'Todo lo que necesitas',
      icon: <ChartIcon size={32} />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Herramientas poderosas para mejorar tu productividad
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <ChartIcon size={20} />, name: 'Métricas', desc: 'Estadísticas', color: 'bg-blue-500/20 text-blue-400' },
              { icon: <BellIcon size={20} />, name: 'Notificaciones', desc: 'Alertas', color: 'bg-yellow-500/20 text-yellow-400' },
              { icon: <PaletteIcon size={20} />, name: 'Estados', desc: 'Personalizar', color: 'bg-purple-500/20 text-purple-400' },
              { icon: <UsersIcon size={20} />, name: 'Equipos', desc: 'Colaborar', color: 'bg-green-500/20 text-green-400' },
            ].map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className={`p-4 rounded-xl ${tool.color} border border-white/5`}
              >
                <div className="mb-2">{tool.icon}</div>
                <h4 className="text-white text-sm font-medium">{tool.name}</h4>
                <p className="text-neutral-500 text-xs">{tool.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: '¡Todo listo!',
      description: 'Comienza a organizar',
      icon: <Rocket className="w-8 h-8" />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-400/30"
          >
            <CheckIcon size={40} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">¡Estás listo!</h2>
            <p className="text-neutral-400">
              Ya puedes comenzar a crear y organizar tus tareas.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <p className="text-neutral-500 text-sm">
              Consejo: Usa el botón <span className="text-yellow-400 font-medium">+</span> para crear tu primera tarea
            </p>
          </motion.div>
        </div>
      )
    }
  ]

  const teamSteps: Step[] = [
    {
      id: 'team-welcome',
      title: `¡Equipo creado!`,
      description: teamName || 'Tu nuevo equipo',
      icon: <UsersIcon size={48} />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-400/30"
          >
            <Users className="w-12 h-12 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">¡{teamName} creado!</h2>
            <p className="text-neutral-400">
              Tu equipo está listo para colaborar
            </p>
          </motion.div>
        </div>
      )
    },
    {
      id: 'team-roles',
      title: 'Roles del equipo',
      description: 'Permisos y responsabilidades',
      icon: <UsersIcon size={32} />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Cada miembro tiene un rol con diferentes permisos
          </p>
          <div className="space-y-3">
            {[
              { name: 'Propietario', desc: 'Control total del equipo', icon: '👑', color: 'from-yellow-500 to-orange-500' },
              { name: 'Admin', desc: 'Gestión de miembros y tareas', icon: '🛡️', color: 'from-blue-500 to-blue-600' },
              { name: 'Miembro', desc: 'Crear y completar tareas', icon: '👤', color: 'from-neutral-600 to-neutral-700' },
            ].map((role, i) => (
              <motion.div
                key={role.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-2xl shadow-lg`}>
                  {role.icon}
                </div>
                <div>
                  <h4 className="text-white font-medium">{role.name}</h4>
                  <p className="text-neutral-500 text-sm">{role.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'team-invite',
      title: 'Invita miembros',
      description: 'Construye tu equipo',
      icon: <Plus className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center mb-6">
            Invita a tu equipo a colaborar
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-gradient-to-br from-neutral-800 to-neutral-800/50 rounded-2xl border border-neutral-700/50 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400/20 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-yellow-400" />
            </div>
            <h4 className="text-white font-medium mb-2">Invitar por correo</h4>
            <p className="text-neutral-500 text-sm mb-4">
              Envía invitaciones por email a los miembros de tu equipo
            </p>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Las invitaciones expiran en 7 días
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-neutral-500 text-sm"
          >
            Usa el botón "Invitar" en el menú de equipos
          </motion.p>
        </div>
      )
    },
    {
      id: 'team-ready',
      title: '¡Equipo listo!',
      description: 'Comienza a colaborar',
      icon: <Rocket className="w-8 h-8" />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-400/30"
          >
            <CheckIcon size={40} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
            <p className="text-neutral-400">
              Tu equipo {teamName} está configurado y listo para trabajar.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4 space-y-2"
          >
            <p className="text-neutral-500 text-sm">
              Próximos pasos sugeridos:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Invitar miembros', 'Crear primera tarea', 'Personalizar estados'].map((step, i) => (
                <span key={i} className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-xs">
                  {step}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      )
    }
  ]

  const steps = type === 'user' ? userSteps : teamSteps
  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const nextStep = () => {
    if (isLastStep) {
      handleClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: isVisible ? 1 : 0.9, opacity: isVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-neutral-800"
      >
        {/* Progress bar */}
        <div className="h-1 bg-neutral-800">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'w-6 bg-yellow-400'
                      : i < currentStep
                      ? 'bg-yellow-400/50'
                      : 'bg-neutral-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-neutral-500 text-sm">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[320px]"
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
            >
              Anterior
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
            >
              Omitir
            </button>
          )}

          <button
            onClick={nextStep}
            className="flex-1 max-w-[200px] px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold hover:shadow-lg hover:shadow-yellow-400/20 transition-all flex items-center justify-center gap-2"
          >
            {isLastStep ? (
              <>
                <Rocket className="w-4 h-4" />
                ¡Comenzar!
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Onboarding
