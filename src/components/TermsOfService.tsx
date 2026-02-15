import { X } from 'lucide-react'

interface TermsOfServiceProps {
  onClose: () => void
}

export default function TermsOfService({ onClose }: TermsOfServiceProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Terminos y Condiciones</h2>
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

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Aceptacion de los Terminos</h3>
            <p className="text-sm leading-relaxed">
              Al acceder y utilizar Tazk ("la Aplicacion"), aceptas estar sujeto a estos Terminos y Condiciones.
              Si no estas de acuerdo con alguna parte de estos terminos, no podras acceder a la Aplicacion.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Descripcion del Servicio</h3>
            <p className="text-sm leading-relaxed">
              Tazk es una plataforma de gestion de tareas y colaboracion en equipo que permite a los usuarios:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Crear, organizar y gestionar tareas personales y de equipo</li>
              <li>Colaborar con otros usuarios en tiempo real</li>
              <li>Establecer fechas limite y recibir notificaciones</li>
              <li>Adjuntar archivos a las tareas</li>
              <li>Visualizar el progreso y metricas de productividad</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Registro y Cuenta</h3>
            <p className="text-sm leading-relaxed">
              Para utilizar ciertas funciones de la Aplicacion, deberas crear una cuenta. Te comprometes a:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Proporcionar informacion veraz, precisa y actualizada</li>
              <li>Mantener la seguridad de tu contrasena y cuenta</li>
              <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
              <li>Ser responsable de todas las actividades realizadas bajo tu cuenta</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Uso Aceptable</h3>
            <p className="text-sm leading-relaxed">
              Te comprometes a no utilizar la Aplicacion para:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Violar leyes o regulaciones aplicables</li>
              <li>Infringir derechos de propiedad intelectual de terceros</li>
              <li>Transmitir contenido ilegal, danino o ofensivo</li>
              <li>Intentar acceder sin autorizacion a sistemas o datos</li>
              <li>Interferir con el funcionamiento normal de la Aplicacion</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Propiedad Intelectual</h3>
            <p className="text-sm leading-relaxed">
              La Aplicacion y todo su contenido, caracteristicas y funcionalidad son propiedad de Tazk y estan
              protegidos por leyes de propiedad intelectual. No se te otorga ningun derecho sobre estos elementos
              mas alla del uso personal no comercial de la Aplicacion.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Contenido del Usuario</h3>
            <p className="text-sm leading-relaxed">
              Conservas todos los derechos sobre el contenido que crees o subas a la Aplicacion. Al usar nuestros
              servicios, nos otorgas una licencia limitada para almacenar, procesar y mostrar tu contenido con el
              unico proposito de proporcionarte el servicio.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Limitacion de Responsabilidad</h3>
            <p className="text-sm leading-relaxed">
              La Aplicacion se proporciona "tal cual" sin garantias de ningun tipo. No seremos responsables de:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
              <li>Interrupciones o errores en el servicio</li>
              <li>Perdida de datos o informacion</li>
              <li>Danos indirectos, incidentales o consecuentes</li>
              <li>Acciones de terceros o uso indebido de tu cuenta</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Modificaciones</h3>
            <p className="text-sm leading-relaxed">
              Nos reservamos el derecho de modificar estos terminos en cualquier momento. Te notificaremos sobre
              cambios significativos a traves de la Aplicacion o por correo electronico. El uso continuado despues
              de dichas modificaciones constituye tu aceptacion de los nuevos terminos.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Terminacion</h3>
            <p className="text-sm leading-relaxed">
              Podemos suspender o terminar tu acceso a la Aplicacion en cualquier momento, sin previo aviso, por
              conductas que consideremos que violan estos terminos o son perjudiciales para otros usuarios o para
              nosotros.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Contacto</h3>
            <p className="text-sm leading-relaxed">
              Si tienes preguntas sobre estos Terminos y Condiciones, puedes contactarnos en:
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
