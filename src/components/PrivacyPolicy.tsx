import { X, Shield, Lock, Eye, Database, Bell, Trash2 } from 'lucide-react'

interface PrivacyPolicyProps {
  onClose: () => void
}

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Politica de Privacidad</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-gray-700 dark:text-neutral-300">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Ultima actualizacion: Enero 2026
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/30 rounded-xl p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              En Tazk, tu privacidad es nuestra prioridad. Esta politica describe como recopilamos,
              usamos y protegemos tu informacion personal.
            </p>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">1. Informacion que Recopilamos</h3>
            </div>
            <p className="text-sm leading-relaxed mb-3">
              Recopilamos la siguiente informacion cuando usas nuestra aplicacion:
            </p>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Informacion de cuenta:</p>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Nombre, correo electronico, foto de perfil (si usas autenticacion social)</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Informacion de perfil:</p>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Telefono, pais, ciudad (opcional)</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Contenido del usuario:</p>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Tareas, equipos, archivos adjuntos, comentarios</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Datos de uso:</p>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Interacciones con la app, preferencias, configuraciones</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">2. Como Usamos tu Informacion</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Utilizamos tu informacion para:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Proporcionar y mantener nuestros servicios</li>
              <li>Personalizar tu experiencia en la aplicacion</li>
              <li>Enviar notificaciones sobre tus tareas y equipos</li>
              <li>Mejorar y optimizar nuestra plataforma</li>
              <li>Comunicarnos contigo sobre actualizaciones importantes</li>
              <li>Prevenir actividades fraudulentas o no autorizadas</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">3. Seguridad de los Datos</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Implementamos medidas de seguridad robustas para proteger tu informacion:
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Encriptacion SSL/TLS</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Datos en transito protegidos</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Encriptacion en reposo</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Base de datos segura</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Autenticacion segura</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">OAuth 2.0 con Google/Microsoft</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Acceso controlado</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Permisos por rol</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">4. Notificaciones y Comunicaciones</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Podemos enviarte notificaciones relacionadas con:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Tareas asignadas o actualizadas</li>
              <li>Fechas limite proximas</li>
              <li>Actividad en tus equipos</li>
              <li>Actualizaciones importantes del servicio</li>
            </ul>
            <p className="text-sm mt-3 text-gray-600 dark:text-neutral-400">
              Puedes gestionar tus preferencias de notificacion en la configuracion de tu cuenta.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">5. Tus Derechos</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Tienes derecho a:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li><span className="font-medium">Acceder</span> a tu informacion personal</li>
              <li><span className="font-medium">Rectificar</span> datos inexactos o incompletos</li>
              <li><span className="font-medium">Eliminar</span> tu cuenta y datos asociados</li>
              <li><span className="font-medium">Exportar</span> tus datos en formato portable</li>
              <li><span className="font-medium">Oponerte</span> al procesamiento de ciertos datos</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Compartir Informacion</h3>
            <p className="text-sm leading-relaxed">
              <span className="font-medium text-yellow-500">No vendemos tu informacion personal.</span> Solo compartimos datos con:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Miembros de tu equipo (segun los permisos que configures)</li>
              <li>Proveedores de servicios esenciales (hosting, correo)</li>
              <li>Autoridades legales cuando sea requerido por ley</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Cookies y Tecnologias</h3>
            <p className="text-sm leading-relaxed">
              Utilizamos cookies y tecnologias similares para:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Mantener tu sesion activa</li>
              <li>Recordar tus preferencias</li>
              <li>Analizar el uso de la aplicacion</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Cambios en esta Politica</h3>
            <p className="text-sm leading-relaxed">
              Podemos actualizar esta politica periodicamente. Te notificaremos sobre cambios significativos
              a traves de la aplicacion o por correo electronico.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Contacto</h3>
            <p className="text-sm leading-relaxed">
              Para consultas sobre privacidad, contactanos en:
              <span className="text-yellow-500 font-medium ml-1">jairozb23@gmail.com</span>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-yellow-400 text-neutral-900 font-bold py-3 rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
