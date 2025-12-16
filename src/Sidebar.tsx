import { useState } from 'react'
import { UserRole } from './types/database.types'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  teamName: string | null
  userRole: UserRole | null
  notificationCount: number
  onShowNotifications: () => void
  onShowMetrics: () => void
  onShowActivityLogs: () => void
  onShowStatuses: () => void
  onLogout: () => void
}

function Sidebar({
  currentView,
  onViewChange,
  teamName,
  userRole,
  notificationCount,
  onShowNotifications,
  onShowMetrics,
  onShowActivityLogs,
  onShowStatuses,
  onLogout
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { id: 'list', icon: '☰', label: 'Lista', view: 'list' },
    { id: 'kanban', icon: '▦', label: 'Kanban', view: 'kanban' },
    { id: 'calendar', icon: '📅', label: 'Calendario', view: 'calendar' },
  ]

  const toolItems = [
    { id: 'metrics', icon: '📊', label: 'Métricas', onClick: onShowMetrics },
    { id: 'activity', icon: '📋', label: 'Actividad', onClick: onShowActivityLogs },
    { id: 'statuses', icon: '🎨', label: 'Estados', onClick: onShowStatuses },
  ]

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-neutral-900 border-r border-neutral-800 z-40 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header / Logo */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <span className="text-2xl">⚡</span>
            {!isCollapsed && <span className="text-xl font-bold text-yellow-400">Tazk</span>}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-neutral-500 hover:text-white transition-colors ${isCollapsed ? 'hidden' : ''}`}
          >
            ◀
          </button>
        </div>
      </div>

      {/* Contexto actual */}
      {!isCollapsed && (
        <div className="p-4 border-b border-neutral-800">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
            {teamName ? 'Equipo' : 'Espacio'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{teamName ? '👥' : '👤'}</span>
            <span className="text-white font-medium truncate">
              {teamName || 'Personal'}
            </span>
          </div>
          {userRole && (
            <div className="text-xs text-neutral-500 mt-1">
              {userRole === 'owner' ? '👑 Propietario' : userRole === 'admin' ? '🛡️ Admin' : '👤 Miembro'}
            </div>
          )}
        </div>
      )}

      {/* Notificaciones */}
      <div className="p-2">
        <button
          onClick={onShowNotifications}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all relative ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <span className="text-lg">🔔</span>
          {!isCollapsed && <span>Notificaciones</span>}
          {notificationCount > 0 && (
            <span className={`bg-yellow-400 text-neutral-900 text-xs font-bold rounded-full flex items-center justify-center ${
              isCollapsed ? 'absolute -top-1 -right-1 w-5 h-5' : 'ml-auto w-5 h-5'
            }`}>
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Navegación principal */}
      <div className="p-2 flex-1">
        {!isCollapsed && (
          <div className="text-xs text-neutral-600 uppercase tracking-wide px-3 mb-2">
            Vistas
          </div>
        )}
        <nav className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isCollapsed ? 'justify-center' : ''
              } ${
                currentView === item.view
                  ? 'bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Herramientas */}
        <div className="mt-6">
          {!isCollapsed && (
            <div className="text-xs text-neutral-600 uppercase tracking-wide px-3 mb-2">
              Herramientas
            </div>
          )}
          <nav className="space-y-1">
            {toolItems.map(item => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Expandir (cuando está colapsado) */}
      {isCollapsed && (
        <div className="p-2 border-t border-neutral-800">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center p-2 text-neutral-500 hover:text-white transition-colors"
          >
            ▶
          </button>
        </div>
      )}

      {/* Footer / Logout */}
      <div className="p-2 border-t border-neutral-800">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="text-lg">🚪</span>
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar