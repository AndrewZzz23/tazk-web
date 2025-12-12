import { supabase } from './supabaseClient'

function Login() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) console.error('Error Google:', error)
  }

  const handleMicrosoftLogin = async () => {
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
    if (error) console.error('Error Microsoft:', error)
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex justify-center">
      <div className="max-w-screen-xl m-0 sm:m-10 bg-neutral-800 shadow-2xl sm:rounded-2xl flex justify-center flex-1">
        
        {/* Lado izquierdo - Formulario */}
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12 flex flex-col justify-center">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400 text-center">⚡ Tazk</h1>
          </div>

          <div className="mt-12 flex flex-col items-center">
            <h2 className="text-2xl xl:text-3xl font-extrabold text-white">
              Iniciar Sesión
            </h2>
            
            <div className="w-full flex-1 mt-8">
              <div className="flex flex-col items-center">
                {/* Botón Google */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full max-w-xs font-bold shadow-lg rounded-lg py-3 bg-neutral-700 text-white flex items-center justify-center transition-all duration-300 ease-in-out hover:bg-yellow-400 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <div className="bg-white p-2 rounded-full">
                    <svg className="w-4" viewBox="0 0 533.5 544.3">
                      <path
                        d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                        fill="#4285f4"
                      />
                      <path
                        d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                        fill="#34a853"
                      />
                      <path
                        d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                        fill="#fbbc04"
                      />
                      <path
                        d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                        fill="#ea4335"
                      />
                    </svg>
                  </div>
                  <span className="ml-4">Continuar con Google</span>
                </button>

                {/* Botón Microsoft */}
                <button
                  onClick={handleMicrosoftLogin}
                  className="w-full max-w-xs font-bold shadow-lg rounded-lg py-3 bg-neutral-700 text-white flex items-center justify-center transition-all duration-300 ease-in-out hover:bg-yellow-400 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 mt-5"
                >
                  <div className="bg-white p-2 rounded-full">
                    <svg className="w-4" viewBox="0 0 24 24">
                      <path fill="#F25022" d="M1 1h10v10H1z"/>
                      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                      <path fill="#FFB900" d="M13 13h10v10H13z"/>
                    </svg>
                  </div>
                  <span className="ml-4">Continuar con Microsoft</span>
                </button>
              </div>

              <p className="mt-6 text-sm text-neutral-400 text-center">
                Al continuar, aceptas nuestros
                <a href="#" className="text-yellow-400 hover:underline ml-1 font-semibold">
                  Términos de Servicio
                </a>
              </p>

            </div>
          </div>
        </div>

        {/* Lado derecho - Branding */}
        <div className="flex-1 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-center hidden lg:flex rounded-r-2xl">
          <div className="m-12 xl:m-16 w-full flex flex-col items-center justify-center gap-10">
             <div className="flex flex-col items-center justify-center text-center gap-6">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">Bienvenido a Tazk</h2>
              {/* tarjetas */}
              <div className="mt-10 relative w-full max-w-xs aspect-video">
              <div className="absolute inset-x-4 inset-y-2 bg-white/20 rounded-xl transform rotate-6 scale-95 blur-sm"></div>
              <div className="absolute inset-x-2 inset-y-1 bg-white/40 rounded-xl transform -rotate-3 scale-95 backdrop-blur-sm"></div>

              <div className="relative bg-white/90 dark:bg-background-dark/90 backdrop-blur-md rounded-xl p-4 shadow-2xl flex flex-col gap-3 border border-white/20">
                
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full w-2/3"></div>
                </div>

                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full w-1/2"></div>
                </div>

                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full w-3/4"></div>
                </div>

              </div>
            </div>

              <p className="mt-12 text-lg font-semibold text-neutral-900 max-w-md drop-shadow-md">
                Gestiona tus tareas y proyectos de forma simple y eficiente.  
                Colabora con tu equipo en tiempo real.
              </p>


            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login