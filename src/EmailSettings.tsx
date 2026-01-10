import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { EmailSettings as EmailSettingsType, EmailTemplate, EmailLog } from './types/database.types'
import { XIcon, LoadingZapIcon, MailIcon } from './components/iu/AnimatedIcons'
import { Settings, FileText, History, Send, CheckCircle, Clock, AlertCircle, User, Zap, Bell, UserCheck, RefreshCw, Eye, Edit3, Copy, Check, Mail } from 'lucide-react'
import Toast from './Toast'

interface EmailSettingsProps {
  currentUserId: string
  teamId: string | null
  onClose: () => void
}

type Tab = 'settings' | 'templates' | 'logs'

const TEMPLATE_TYPES = [
  { id: 'task_created', name: 'Tarea creada', icon: FileText, color: 'from-yellow-400 to-amber-500', bgColor: 'bg-yellow-400/10', textColor: 'text-yellow-400' },
  { id: 'task_assigned', name: 'Tarea asignada', icon: UserCheck, color: 'from-blue-400 to-cyan-500', bgColor: 'bg-blue-400/10', textColor: 'text-blue-400' },
  { id: 'task_due', name: 'Tarea por vencer', icon: Clock, color: 'from-orange-400 to-red-500', bgColor: 'bg-orange-400/10', textColor: 'text-orange-400' },
  { id: 'task_completed', name: 'Tarea completada', icon: CheckCircle, color: 'from-emerald-400 to-green-500', bgColor: 'bg-emerald-400/10', textColor: 'text-emerald-400' },
]

const TEMPLATE_VARIABLES = [
  { var: '{{task_title}}', desc: 'Título de la tarea' },
  { var: '{{task_description}}', desc: 'Descripción' },
  { var: '{{status_name}}', desc: 'Estado actual' },
  { var: '{{due_date}}', desc: 'Fecha límite' },
  { var: '{{created_by_name}}', desc: 'Creador' },
  { var: '{{assigned_to_name}}', desc: 'Asignado a' },
  { var: '{{task_url}}', desc: 'Link a la tarea' },
  { var: '{{completed_date}}', desc: 'Fecha completado' },
]

function EmailSettings({ currentUserId, teamId, onClose }: EmailSettingsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<EmailSettingsType | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [fromName, setFromName] = useState('Tazk')
  const [notifyOnCreate, setNotifyOnCreate] = useState(true)
  const [notifyOnAssign, setNotifyOnAssign] = useState(true)
  const [notifyOnDue, setNotifyOnDue] = useState(true)
  const [notifyOnComplete, setNotifyOnComplete] = useState(false)

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editHtml, setEditHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Test email
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Copy feedback
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false, message: '', type: 'info'
  })

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadSettings()
    loadTemplates()
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingTemplate) {
          setEditingTemplate(null)
        } else if (showPreview) {
          setShowPreview(false)
        } else {
          handleClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingTemplate, showPreview])

  const loadSettings = async () => {
    setLoading(true)

    let query = supabase
      .from('email_settings')
      .select('*')
      .eq('user_id', currentUserId)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data, error } = await query.maybeSingle()

    console.log('EmailSettings loadSettings:', { data, error, currentUserId, teamId })

    if (data) {
      console.log('Setting isEnabled to:', data.is_enabled)
      setSettings(data)
      setIsEnabled(data.is_enabled)
      setFromName(data.from_name || 'Tazk')
      setNotifyOnCreate(data.notify_on_create)
      setNotifyOnAssign(data.notify_on_assign)
      setNotifyOnDue(data.notify_on_due)
      setNotifyOnComplete(data.notify_on_complete)
    }

    setLoading(false)
  }

  const loadTemplates = async () => {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', currentUserId)
      .order('type')

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data } = await query

    if (data && data.length > 0) {
      setTemplates(data)
    } else {
      await createDefaultTemplates()
    }
  }

  const createDefaultTemplates = async () => {
    const { error } = await supabase.rpc('create_default_email_templates', {
      p_user_id: currentUserId,
      p_team_id: teamId
    })

    if (!error) {
      loadTemplates()
    }
  }

  const loadLogs = async () => {
    setLogsLoading(true)

    let query = supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.eq('user_id', currentUserId)
    }

    const { data } = await query
    setLogs(data || [])
    setLogsLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const saveSettings = async () => {
    setSaving(true)

    const settingsData = {
      user_id: currentUserId,
      team_id: teamId,
      is_enabled: isEnabled,
      from_name: fromName,
      notify_on_create: notifyOnCreate,
      notify_on_assign: notifyOnAssign,
      notify_on_due: notifyOnDue,
      notify_on_complete: notifyOnComplete,
      updated_at: new Date().toISOString()
    }

    if (settings) {
      const { error } = await supabase
        .from('email_settings')
        .update(settingsData)
        .eq('id', settings.id)

      console.log('EmailSettings update:', { error, settingsData })

      if (error) {
        showToast('Error al guardar', 'error')
      } else {
        showToast('Configuración guardada', 'success')
      }
    } else {
      const { data, error } = await supabase
        .from('email_settings')
        .insert(settingsData)
        .select()
        .single()

      console.log('EmailSettings insert:', { data, error, settingsData })

      if (error) {
        showToast('Error al crear configuración', 'error')
      } else {
        setSettings(data)
        showToast('Configuración creada', 'success')
      }
    }

    setSaving(false)
  }

  const saveTemplate = async () => {
    if (!editingTemplate) return

    setSaving(true)

    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: editSubject,
        body_html: editHtml,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTemplate.id)

    if (error) {
      showToast('Error al guardar plantilla', 'error')
    } else {
      setTemplates(prev => prev.map(t =>
        t.id === editingTemplate.id
          ? { ...t, subject: editSubject, body_html: editHtml }
          : t
      ))
      setEditingTemplate(null)
      showToast('Plantilla guardada', 'success')
    }

    setSaving(false)
  }

  const toggleTemplateActive = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)

    if (!error) {
      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ))
      showToast(template.is_active ? 'Plantilla desactivada' : 'Plantilla activada', 'success')
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      showToast('Ingresa un correo', 'error')
      return
    }

    setSendingTest(true)

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Correo de prueba - Tazk',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #facc15 0%, #f97316 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <div style="margin-bottom: 10px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
                  </svg>
                </div>
                <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Tazk</h1>
                <p style="color: #1a1a1a; margin: 10px 0 0; opacity: 0.8;">Gestión de tareas</p>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
                <h2 style="color: #1a1a1a; margin: 0 0 15px;">¡Correo de prueba exitoso!</h2>
                <p style="color: #666; line-height: 1.6; margin: 0;">
                  Este es un correo de prueba desde tu configuración de Tazk.
                  Si estás viendo este mensaje, las notificaciones por email están funcionando correctamente.
                </p>
                <div style="margin-top: 25px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                  <p style="color: #888; font-size: 14px; margin: 0;">
                    Enviado desde Tazk · ${new Date().toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
            </div>
          `,
          from_name: fromName,
          template_type: 'test',
          user_id: currentUserId,
          team_id: teamId
        }
      })

      if (error) throw error

      showToast('Correo de prueba enviado', 'success')
      setTestEmail('')
      if (activeTab === 'logs') loadLogs()
    } catch (error: any) {
      showToast(error.message || 'Error al enviar', 'error')
    }

    setSendingTest(false)
  }

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable)
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const getPreviewHtml = () => {
    return editHtml
      .replace(/\{\{task_title\}\}/g, 'Ejemplo de tarea')
      .replace(/\{\{task_description\}\}/g, 'Esta es una descripción de ejemplo para la tarea.')
      .replace(/\{\{status_name\}\}/g, 'En Progreso')
      .replace(/\{\{due_date\}\}/g, '31/12/2025 18:00')
      .replace(/\{\{created_by_name\}\}/g, 'Juan Pérez')
      .replace(/\{\{assigned_to_name\}\}/g, 'María García')
      .replace(/\{\{task_url\}\}/g, `${window.location.origin}/task/example-task-id`)
      .replace(/\{\{completed_date\}\}/g, '27/12/2025 15:30')
  }

  // Stats para logs
  const logStats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    pending: logs.filter(l => l.status === 'pending').length,
    failed: logs.filter(l => l.status === 'failed').length,
  }

  const tabs = [
    { id: 'settings' as Tab, label: 'Configuración', icon: Settings },
    { id: 'templates' as Tab, label: 'Plantillas', icon: FileText },
    { id: 'logs' as Tab, label: 'Historial', icon: History },
  ]

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-300 flex flex-col border border-gray-200 dark:border-neutral-800 ${
            isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MailIcon size={40} />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración de Correos</h2>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                    {teamId ? 'Configuración de equipo' : 'Configuración personal'} · {isEnabled ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-all hover:rotate-90 duration-200"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <LoadingZapIcon size={48} />
                <p className="text-gray-500 dark:text-neutral-400 mt-4">Cargando configuración...</p>
              </div>
            ) : (
              <>
                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    {/* Master Toggle */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-orange-500/10 dark:from-yellow-400/5 dark:via-orange-400/5 dark:to-orange-500/5 p-6 border border-yellow-400/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            isEnabled
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30'
                              : 'bg-gray-200 dark:bg-neutral-700'
                          }`}>
                            <Zap className={`w-6 h-6 transition-colors ${isEnabled ? 'text-white' : 'text-gray-400 dark:text-neutral-500'}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones por email</h3>
                            <p className="text-gray-500 dark:text-neutral-400 text-sm">
                              {isEnabled ? 'Los correos automáticos están activos' : 'Activa para recibir notificaciones'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !isEnabled
                            setIsEnabled(newValue)

                            // Guardar automáticamente
                            const settingsData = {
                              user_id: currentUserId,
                              team_id: teamId,
                              is_enabled: newValue,
                              from_name: fromName,
                              notify_on_create: notifyOnCreate,
                              notify_on_assign: notifyOnAssign,
                              notify_on_due: notifyOnDue,
                              notify_on_complete: notifyOnComplete,
                              updated_at: new Date().toISOString()
                            }

                            if (settings) {
                              await supabase
                                .from('email_settings')
                                .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
                                .eq('id', settings.id)
                            } else {
                              const { data } = await supabase
                                .from('email_settings')
                                .insert(settingsData)
                                .select()
                                .single()
                              if (data) setSettings(data)
                            }
                          }}
                          className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                            isEnabled
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30'
                              : 'bg-gray-300 dark:bg-neutral-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                              isEnabled ? 'translate-x-8' : 'translate-x-1.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* From Name */}
                    <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          Nombre del remitente
                        </label>
                      </div>
                      <input
                        type="text"
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="Tazk"
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
                      />
                      <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2">
                        Este nombre aparecerá como remitente en los correos
                      </p>
                    </div>

                    {/* Triggers */}
                    <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                          <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Eventos de notificación</h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { id: 'create', label: 'Tarea creada', desc: 'Al crear una nueva tarea', icon: FileText, value: notifyOnCreate, setter: setNotifyOnCreate, color: 'yellow' },
                          { id: 'assign', label: 'Tarea asignada', desc: 'Al asignar a un usuario', icon: UserCheck, value: notifyOnAssign, setter: setNotifyOnAssign, color: 'blue' },
                          { id: 'due', label: 'Por vencer', desc: 'Recordatorio de fecha límite', icon: Clock, value: notifyOnDue, setter: setNotifyOnDue, color: 'orange' },
                          { id: 'complete', label: 'Completada', desc: 'Al marcar como completada', icon: CheckCircle, value: notifyOnComplete, setter: setNotifyOnComplete, color: 'emerald' },
                        ].map(trigger => {
                          const Icon = trigger.icon
                          return (
                            <div
                              key={trigger.id}
                              onClick={() => trigger.setter(!trigger.value)}
                              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                                trigger.value
                                  ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm'
                                  : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-neutral-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                  trigger.value
                                    ? `bg-${trigger.color}-100 dark:bg-${trigger.color}-500/20`
                                    : 'bg-gray-100 dark:bg-neutral-700'
                                }`}>
                                  <Icon className={`w-5 h-5 transition-colors ${
                                    trigger.value
                                      ? `text-${trigger.color}-600 dark:text-${trigger.color}-400`
                                      : 'text-gray-400 dark:text-neutral-500'
                                  }`} />
                                </div>
                                <div>
                                  <p className={`text-sm font-medium transition-colors ${
                                    trigger.value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-neutral-400'
                                  }`}>{trigger.label}</p>
                                  <p className="text-xs text-gray-400 dark:text-neutral-500">{trigger.desc}</p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                trigger.value
                                  ? 'bg-yellow-400 border-yellow-400'
                                  : 'border-gray-300 dark:border-neutral-600'
                              }`}>
                                {trigger.value && <Check className="w-3 h-3 text-neutral-900" />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Test Email */}
                    <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Correo de prueba</h3>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="flex-1 px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                        />
                        <button
                          onClick={sendTestEmail}
                          disabled={sendingTest || !testEmail.trim()}
                          className="px-5 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                          {sendingTest ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">{sendingTest ? 'Enviando...' : 'Enviar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Guardar configuración
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Templates Tab */}
                {activeTab === 'templates' && (
                  <div className="space-y-6">
                    {templates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-gray-500 dark:text-neutral-400">Cargando plantillas...</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {templates.map(template => {
                          const typeInfo = TEMPLATE_TYPES.find(t => t.id === template.type)
                          const Icon = typeInfo?.icon || FileText
                          return (
                            <div
                              key={template.id}
                              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                                template.is_active
                                  ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md'
                                  : 'bg-gray-50 dark:bg-neutral-800/50 border-gray-100 dark:border-neutral-800 opacity-60 hover:opacity-80'
                              }`}
                            >
                              <div className={`absolute inset-0 opacity-5 bg-gradient-to-r ${typeInfo?.color || 'from-gray-400 to-gray-500'}`} />
                              <div className="relative p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${typeInfo?.color || 'from-gray-400 to-gray-500'} shadow-lg`}>
                                      <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-semibold ${typeInfo?.textColor || 'text-gray-600'}`}>
                                        {typeInfo?.name}
                                      </h4>
                                      <p className="text-gray-600 dark:text-neutral-300 text-sm mt-1 line-clamp-1">
                                        {template.subject}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => toggleTemplateActive(template)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        template.is_active
                                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'
                                      }`}
                                    >
                                      {template.is_active ? 'Activa' : 'Inactiva'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingTemplate(template)
                                        setEditSubject(template.subject)
                                        setEditHtml(template.body_html)
                                      }}
                                      className="p-2 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Variables disponibles */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-blue-700 dark:text-blue-400 font-semibold">Variables disponibles</h4>
                      </div>
                      <p className="text-blue-600/70 dark:text-blue-400/70 text-sm mb-4">
                        Haz clic en una variable para copiarla al portapapeles
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TEMPLATE_VARIABLES.map(v => (
                          <button
                            key={v.var}
                            onClick={() => copyVariable(v.var)}
                            className="flex items-center justify-between gap-2 p-2.5 bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all group text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <code className="bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-mono">
                                {v.var}
                              </code>
                              <span className="text-gray-500 dark:text-neutral-400 text-xs truncate">{v.desc}</span>
                            </div>
                            {copiedVar === v.var ? (
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                  <div className="space-y-6">
                    {/* Stats */}
                    {logs.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Total', value: logStats.total, color: 'gray', icon: Mail },
                          { label: 'Enviados', value: logStats.sent, color: 'emerald', icon: CheckCircle },
                          { label: 'Pendientes', value: logStats.pending, color: 'amber', icon: Clock },
                          { label: 'Fallidos', value: logStats.failed, color: 'red', icon: AlertCircle },
                        ].map(stat => {
                          const Icon = stat.icon
                          return (
                            <div key={stat.label} className={`bg-${stat.color}-50 dark:bg-${stat.color}-500/10 rounded-xl p-4 border border-${stat.color}-100 dark:border-${stat.color}-500/20`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 text-${stat.color}-500 dark:text-${stat.color}-400`} />
                                <span className={`text-xs text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.label}</span>
                              </div>
                              <p className={`text-2xl font-bold text-${stat.color}-700 dark:text-${stat.color}-300`}>{stat.value}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {logsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <LoadingZapIcon size={48} />
                        <p className="text-gray-500 dark:text-neutral-400 mt-4">Cargando historial...</p>
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                          <Mail className="w-8 h-8 text-gray-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">Sin correos enviados</p>
                        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">El historial de correos aparecerá aquí</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map(log => (
                          <div
                            key={log.id}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl hover:shadow-sm transition-all"
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              log.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                              log.status === 'failed' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
                            }`}>
                              {log.status === 'sent' ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              ) : log.status === 'failed' ? (
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                              ) : (
                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white text-sm font-medium truncate">
                                {log.subject || 'Sin asunto'}
                              </p>
                              <p className="text-gray-500 dark:text-neutral-400 text-xs truncate">
                                {log.to_email}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                                log.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                log.status === 'failed' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              }`}>
                                {log.status === 'sent' ? 'Enviado' : log.status === 'failed' ? 'Fallido' : 'Pendiente'}
                              </span>
                              <p className="text-gray-400 dark:text-neutral-500 text-xs mt-1">
                                {new Date(log.created_at).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Refresh button */}
                    {logs.length > 0 && (
                      <button
                        onClick={loadLogs}
                        disabled={logsLoading}
                        className="w-full py-3 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                        Actualizar historial
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Editor de Plantilla */}
      {editingTemplate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                  TEMPLATE_TYPES.find(t => t.id === editingTemplate.type)?.color || 'from-gray-400 to-gray-500'
                }`}>
                  {(() => {
                    const Icon = TEMPLATE_TYPES.find(t => t.id === editingTemplate.type)?.icon || FileText
                    return <Icon className="w-5 h-5 text-white" />
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {TEMPLATE_TYPES.find(t => t.id === editingTemplate.type)?.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">Editar plantilla de correo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    showPreview
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 shadow-lg shadow-orange-500/20'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Editor' : 'Vista previa'}
                </button>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {showPreview ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-neutral-400 text-sm">
                      <span className="font-medium">Asunto:</span> {editSubject.replace(/\{\{task_title\}\}/g, 'Ejemplo de tarea')}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div
                      className="p-4"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                      Asunto del correo
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                    />
                  </div>

                  {/* HTML Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                      Contenido HTML
                    </label>
                    <textarea
                      value={editHtml}
                      onChange={(e) => setEditHtml(e.target.value)}
                      rows={16}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-neutral-800 flex gap-3 bg-gray-50 dark:bg-neutral-800/50">
              <button
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar plantilla
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  )
}

export default EmailSettings
