import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { EmailTemplate, EmailLog } from './types/database.types'
import { XIcon, LoadingZapIcon, MailIcon } from './components/iu/AnimatedIcons'
import { Settings, FileText, History, Send, CheckCircle, Clock, AlertCircle, Zap, Bell, UserCheck, RefreshCw, Eye, Edit3, Copy, Check, Mail, Link, Unlink } from 'lucide-react'
import Toast from './Toast'

// Iconos de proveedores
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
)

interface EmailSettingsProps {
  currentUserId: string
  teamId: string | null
  onClose?: () => void
}

type Tab = 'settings' | 'templates' | 'logs'

const TEMPLATE_TYPES = [
  { id: 'task_created', name: 'Tarea creada', icon: FileText, color: 'from-yellow-400 to-amber-500', bgColor: 'bg-yellow-400/10', textColor: 'text-yellow-400' },
  { id: 'task_assigned', name: 'Tarea asignada', icon: UserCheck, color: 'from-blue-400 to-cyan-500', bgColor: 'bg-blue-400/10', textColor: 'text-blue-400' },
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
  const isViewMode = !onClose // Si no hay onClose, es modo vista (no modal)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Settings state
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [fromName, setFromName] = useState('Tazk')
  const [notifyOnCreate, setNotifyOnCreate] = useState(true)
  const [notifyOnAssign, setNotifyOnAssign] = useState(true)
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

  // OAuth email state
  const [connectedEmail, setConnectedEmail] = useState<{ provider: string; email: string } | null>(null)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

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
    loadConnectedEmail()
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
      setSettingsId(data.id)
      setIsEnabled(data.is_enabled)
      setFromName(data.from_name || 'Tazk')
      setNotifyOnCreate(data.notify_on_create)
      setNotifyOnAssign(data.notify_on_assign)
      setNotifyOnComplete(data.notify_on_complete)
    }

    setLoading(false)
  }

  const loadConnectedEmail = async () => {
    // Verificar si hay un OAuth recién conectado en localStorage
    const oauthConnected = localStorage.getItem('oauth_connected')
    if (oauthConnected) {
      try {
        const { provider, email } = JSON.parse(oauthConnected)
        setConnectedEmail({ provider, email })
        localStorage.removeItem('oauth_connected')
        showToast(`Correo ${email} conectado`, 'success')
        return
      } catch {
        localStorage.removeItem('oauth_connected')
      }
    }

    const { data } = await supabase
      .from('email_oauth_tokens')
      .select('provider, email')
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (data) {
      setConnectedEmail({ provider: data.provider, email: data.email })
    }
  }

  const connectEmail = async (provider: 'google' | 'microsoft') => {
    setConnectingProvider(provider)

    const baseUrl = window.location.origin
    const redirectUri = `${baseUrl}/auth/${provider}/callback`

    if (provider === 'google') {
      const clientId = '123664543208-gkta467kt0ap5tpbresletpp7jojvis5.apps.googleusercontent.com'
      const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`
      window.location.href = authUrl
    } else {
      const clientId = 'd433a89f-67d6-4430-9a9b-b6b174453acb'
      const scopes = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access'
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&response_mode=query`
      window.location.href = authUrl
    }
  }

  const disconnectEmail = async () => {
    try {
      const { error } = await supabase
        .from('email_oauth_tokens')
        .delete()
        .eq('user_id', currentUserId)

      if (error) throw error

      setConnectedEmail(null)
      showToast('Correo desconectado', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error al desconectar', 'error')
    }
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
    if (!onClose) return
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const updateSetting = async (field: string, value: boolean) => {
    if (!settingsId) return
    const { error } = await supabase
      .from('email_settings')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', settingsId)
    if (error) {
      console.error('Error updating setting:', error)
      showToast('Error al guardar', 'error')
    }
  }

  const saveSettings = async () => {
    setSaving(true)

    const settingsData = {
      is_enabled: isEnabled,
      from_name: fromName,
      notify_on_create: notifyOnCreate,
      notify_on_assign: notifyOnAssign,
      notify_on_complete: notifyOnComplete,
      updated_at: new Date().toISOString()
    }

    if (settingsId) {
      const { error } = await supabase
        .from('email_settings')
        .update(settingsData)
        .eq('id', settingsId)

      if (error) {
        console.error('EmailSettings save error:', error)
        showToast('Error al guardar', 'error')
      } else {
        showToast('Configuración guardada', 'success')
      }
    } else {
      const { data, error } = await supabase
        .from('email_settings')
        .insert({ ...settingsData, user_id: currentUserId, team_id: teamId })
        .select()
        .single()

      if (error) {
        console.error('EmailSettings insert error:', error)
        showToast('Error al guardar', 'error')
      } else {
        if (data) setSettingsId(data.id)
        showToast('Configuración guardada', 'success')
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

  // Validar formato de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  // Detectar errores comunes de tipeo en dominios populares
  const checkCommonTypos = (email: string): { hasTipo: boolean; suggestion?: string } => {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return { hasTipo: false }

    const typoMap: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'outlook.co': 'outlook.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
    }

    if (typoMap[domain]) {
      const user = email.split('@')[0]
      return { hasTipo: true, suggestion: `${user}@${typoMap[domain]}` }
    }

    return { hasTipo: false }
  }

  // Lista de dominios de correo desechables/temporales
  const isDisposableEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase()
    const disposableDomains = [
      'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
      '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
      'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
      'tempail.com', 'emailondeck.com', 'tempr.email', 'discard.email'
    ]
    return disposableDomains.includes(domain)
  }

  // Validar que el dominio del email sea válido (tiene MX records)
  const validateEmailDomain = async (email: string): Promise<{ valid: boolean; message?: string }> => {
    const domain = email.split('@')[1]
    if (!domain) return { valid: false, message: 'Correo inválido' }

    try {
      // Usar API de DNS para verificar MX records
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`)
      const data = await response.json()

      if (data.Answer && data.Answer.length > 0) {
        return { valid: true }
      } else {
        return { valid: false, message: `El dominio "${domain}" no puede recibir correos` }
      }
    } catch {
      // Si falla la verificación DNS, permitir el envío (no bloquear por error de red)
      return { valid: true }
    }
  }

  const sendTestEmail = async () => {
    const email = testEmail.trim()

    if (!email) {
      showToast('Ingresa un correo', 'error')
      return
    }

    // Validar formato
    if (!isValidEmail(email)) {
      showToast('El formato del correo no es válido', 'error')
      return
    }

    // Verificar errores de tipeo comunes
    const typoCheck = checkCommonTypos(email)
    if (typoCheck.hasTipo && typoCheck.suggestion) {
      showToast(`¿Quisiste decir ${typoCheck.suggestion}?`, 'error')
      setTestEmail(typoCheck.suggestion)
      return
    }

    // Verificar si es correo desechable
    if (isDisposableEmail(email)) {
      showToast('No se permiten correos temporales o desechables', 'error')
      return
    }

    setSendingTest(true)

    // Validar dominio (MX records)
    const domainValidation = await validateEmailDomain(email)
    if (!domainValidation.valid) {
      showToast(domainValidation.message || 'Correo inválido', 'error')
      setSendingTest(false)
      return
    }

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: '⚡ Correo de prueba - Tazk',
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td align="center" style="padding-bottom:32px;"><table cellpadding="0" cellspacing="0"><tr><td style="background-color:#171717;width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;font-size:24px;">⚡</td><td style="padding-left:12px;font-size:24px;font-weight:700;color:#171717;letter-spacing:-0.5px;">Tazk</td></tr></table></td></tr><tr><td style="background-color:#171717;border-radius:16px;overflow:hidden;"><div style="height:4px;background:linear-gradient(90deg,#facc15,#f59e0b,#facc15);"></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 32px 0 32px;"><table cellpadding="0" cellspacing="0"><tr><td style="background-color:#facc1520;border:1px solid #facc1540;border-radius:20px;padding:6px 14px;"><span style="color:#facc15;font-size:12px;font-weight:600;letter-spacing:0.5px;">CORREO DE PRUEBA</span></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 32px 0 32px;"><h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Conexion exitosa</h1></td></tr><tr><td style="padding:12px 32px 0 32px;"><p style="margin:0;font-size:15px;color:#a3a3a3;line-height:1.6;">Si estas viendo este mensaje, las notificaciones por email estan funcionando correctamente.</p></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="padding:0 32px;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-radius:12px;overflow:hidden;"><tr><td style="padding:14px 16px;border-bottom:1px solid #262626;"><span style="color:#737373;font-size:13px;">Cuenta</span></td><td style="padding:14px 16px;border-bottom:1px solid #262626;text-align:right;"><span style="color:#facc15;font-size:13px;font-weight:600;">${email}</span></td></tr><tr><td style="padding:14px 16px;"><span style="color:#737373;font-size:13px;">Fecha</span></td><td style="padding:14px 16px;text-align:right;"><span style="color:#ffffff;font-size:13px;font-weight:600;">${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 32px 32px 32px;"></td></tr></table></td></tr><tr><td align="center" style="padding-top:32px;"><p style="margin:0;color:#a3a3a3;font-size:12px;">Enviado desde <span style="color:#f59e0b;font-weight:600;">Tazk</span> · Gestion inteligente de tareas</p></td></tr></table></td></tr></table></body></html>`,
          from_name: fromName,
          template_type: 'test',
          user_id: currentUserId,
          team_id: teamId
        }
      })

      if (error) throw error

      showToast('Correo enviado. Verifica tu bandeja de entrada.', 'success')
      setTestEmail('')
      // Recargar logs después de un momento para que se registre
      setTimeout(() => {
        if (activeTab === 'logs') loadLogs()
      }, 1000)
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

  // Contenido de los tabs (reutilizable)
  const renderTabContent = () => (
    <>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingZapIcon size={48} />
          <p className="text-gray-500 dark:text-neutral-400 mt-4">Cargando configuración...</p>
        </div>
      ) : (
        <>
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </>
      )}
    </>
  )

  // Render settings tab content
  const renderSettingsTab = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Master Toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400/10 via-orange-400/10 to-orange-500/10 dark:from-yellow-400/5 dark:via-orange-400/5 dark:to-orange-500/5 p-6 border border-yellow-400/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isEnabled ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/30' : 'bg-gray-200 dark:bg-neutral-700'
            }`}>
              <Zap className={`w-6 h-6 ${isEnabled ? 'text-white' : 'text-gray-400 dark:text-neutral-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones por correo</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {isEnabled ? 'Envío de correos automáticos activo' : 'Activar envío de notificaciones por correo'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const newValue = !isEnabled
              setIsEnabled(newValue)

              try {
                if (settingsId) {
                  const { error } = await supabase
                    .from('email_settings')
                    .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
                    .eq('id', settingsId)
                  if (error) throw error
                } else {
                  const { data, error } = await supabase
                    .from('email_settings')
                    .insert({
                      user_id: currentUserId,
                      team_id: teamId,
                      is_enabled: newValue,
                      from_name: fromName,
                      notify_on_create: notifyOnCreate,
                      notify_on_assign: notifyOnAssign,
                      notify_on_complete: notifyOnComplete,
                    })
                    .select()
                    .single()
                  if (error) throw error
                  if (data) setSettingsId(data.id)
                }
                showToast(newValue ? 'Notificaciones activadas' : 'Notificaciones desactivadas', 'success')
              } catch (err: any) {
                console.error('Error toggling email:', err)
                setIsEnabled(!newValue)
                showToast('Error al cambiar notificaciones', 'error')
              }
            }}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
              isEnabled ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-300 dark:bg-neutral-600'
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
              isEnabled ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {isEnabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Conectar correo OAuth */}
          <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <Link className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Conectar tu correo</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  Los emails se enviarán desde tu cuenta personal
                </p>
              </div>
            </div>

            {connectedEmail ? (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                    {connectedEmail.provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{connectedEmail.email}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Conectado con {connectedEmail.provider === 'google' ? 'Gmail' : 'Outlook'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={disconnectEmail}
                  className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                >
                  <Unlink className="w-4 h-4" />
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => connectEmail('google')}
                  disabled={connectingProvider !== null}
                  className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-md transition-all disabled:opacity-50"
                >
                  {connectingProvider === 'google' ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span className="font-medium text-gray-700 dark:text-neutral-300">
                    {connectingProvider === 'google' ? 'Conectando...' : 'Gmail'}
                  </span>
                </button>
                <button
                  onClick={() => connectEmail('microsoft')}
                  disabled={connectingProvider !== null}
                  className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-md transition-all disabled:opacity-50"
                >
                  {connectingProvider === 'microsoft' ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <MicrosoftIcon />
                  )}
                  <span className="font-medium text-gray-700 dark:text-neutral-300">
                    {connectingProvider === 'microsoft' ? 'Conectando...' : 'Outlook'}
                  </span>
                </button>
              </div>
            )}

            {!connectedEmail && (
              <p className="text-xs text-gray-400 dark:text-neutral-500 mt-3 text-center">
                Al conectar, autorizas a Tazk a enviar correos en tu nombre
              </p>
            )}
          </div>

          {/* Eventos de notificación */}
          <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Eventos de notificación</h3>
            </div>
            <div className="space-y-3">
              {/* Tarea creada */}
              <div
                onClick={() => { setNotifyOnCreate(!notifyOnCreate); updateSetting('notify_on_create', !notifyOnCreate) }}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  notifyOnCreate
                    ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
                    : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    notifyOnCreate ? 'bg-yellow-100 dark:bg-yellow-500/20' : 'bg-gray-100 dark:bg-neutral-800'
                  }`}>
                    <FileText className={`w-5 h-5 ${notifyOnCreate ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${notifyOnCreate ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'}`}>
                      Tarea creada
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-neutral-500">Al crear una nueva tarea</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  notifyOnCreate ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300 dark:border-neutral-600'
                }`}>
                  {notifyOnCreate && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Tarea asignada */}
              <div
                onClick={() => { setNotifyOnAssign(!notifyOnAssign); updateSetting('notify_on_assign', !notifyOnAssign) }}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  notifyOnAssign
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                    : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    notifyOnAssign ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-gray-100 dark:bg-neutral-800'
                  }`}>
                    <UserCheck className={`w-5 h-5 ${notifyOnAssign ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${notifyOnAssign ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'}`}>
                      Tarea asignada
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-neutral-500">Al asignar a un usuario</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  notifyOnAssign ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-neutral-600'
                }`}>
                  {notifyOnAssign && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Tarea completada */}
              <div
                onClick={() => { setNotifyOnComplete(!notifyOnComplete); updateSetting('notify_on_complete', !notifyOnComplete) }}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  notifyOnComplete
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    notifyOnComplete ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-gray-100 dark:bg-neutral-800'
                  }`}>
                    <CheckCircle className={`w-5 h-5 ${notifyOnComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${notifyOnComplete ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'}`}>
                      Completada
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-neutral-500">Al marcar como completada</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  notifyOnComplete ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-neutral-600'
                }`}>
                  {notifyOnComplete && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          </div>

          {/* Test Email - Solo si hay correo conectado */}
          {connectedEmail && (
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                  <Send className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Correo de prueba</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail.trim()}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingTest ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-neutral-500 mt-2">
                Se enviará desde {connectedEmail.email}
              </p>
            </div>
          )}

          {/* Guardar */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-yellow-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? <LoadingZapIcon size={20} /> : <Check className="w-5 h-5" />}
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      )}
    </div>
  )

  // Render templates tab
  const renderTemplatesTab = () => (
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
  )

  // Render logs tab
  const renderLogsTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total */}
          <div className="bg-gray-50 dark:bg-gray-500/10 rounded-xl p-4 border border-gray-100 dark:border-gray-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{logStats.total}</p>
          </div>
          {/* Enviados */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Enviados</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{logStats.sent}</p>
          </div>
          {/* Pendientes */}
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{logStats.pending}</p>
          </div>
          {/* Fallidos */}
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              <span className="text-xs text-red-600 dark:text-red-400">Fallidos</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{logStats.failed}</p>
          </div>
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
  )

  // View mode (no modal wrapper)
  if (isViewMode) {
    return (
      <div className="pb-24 sm:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <MailIcon size={32} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración de Correos</h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                {teamId ? 'Configuración de equipo' : 'Configuración personal'} · {isEnabled ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
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

        {/* Content */}
        {renderTabContent()}

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}

        {/* Modal Editor de Plantilla (también en view mode) */}
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
              <div className="flex-1 overflow-y-auto p-6">
                {showPreview ? (
                  <div className="space-y-4">
                    <div className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Asunto:</p>
                      <p className="text-gray-900 dark:text-white font-medium">{editSubject}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
                      <div dangerouslySetInnerHTML={{ __html: editHtml }} className="prose dark:prose-invert max-w-none" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Asunto</label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Contenido HTML</label>
                      <textarea
                        value={editHtml}
                        onChange={(e) => setEditHtml(e.target.value)}
                        rows={15}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-5 py-2.5 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveTemplate()}
                  className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
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

                            try {
                              if (settingsId) {
                                const { error } = await supabase
                                  .from('email_settings')
                                  .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
                                  .eq('id', settingsId)
                                if (error) throw error
                              } else {
                                const { data, error } = await supabase
                                  .from('email_settings')
                                  .insert({
                                    user_id: currentUserId,
                                    team_id: teamId,
                                    is_enabled: newValue,
                                    from_name: fromName,
                                    notify_on_create: notifyOnCreate,
                                    notify_on_assign: notifyOnAssign,
                                    notify_on_complete: notifyOnComplete,
                                  })
                                  .select()
                                  .single()
                                if (error) throw error
                                if (data) setSettingsId(data.id)
                              }
                            } catch (err: any) {
                              console.error('Error toggling email:', err)
                              setIsEnabled(!newValue)
                              showToast('Error al cambiar notificaciones', 'error')
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

                    {/* Conectar correo OAuth */}
                    <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-5 border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                          <Link className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Conectar tu correo</h3>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">
                            Los emails se enviarán desde tu cuenta personal
                          </p>
                        </div>
                      </div>

                      {connectedEmail ? (
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                              {connectedEmail.provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{connectedEmail.email}</p>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Conectado con {connectedEmail.provider === 'google' ? 'Gmail' : 'Outlook'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={disconnectEmail}
                            className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                          >
                            <Unlink className="w-4 h-4" />
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => connectEmail('google')}
                            disabled={connectingProvider !== null}
                            className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-md transition-all disabled:opacity-50"
                          >
                            {connectingProvider === 'google' ? (
                              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                            ) : (
                              <GoogleIcon />
                            )}
                            <span className="font-medium text-gray-700 dark:text-neutral-300">
                              {connectingProvider === 'google' ? 'Conectando...' : 'Gmail'}
                            </span>
                          </button>
                          <button
                            onClick={() => connectEmail('microsoft')}
                            disabled={connectingProvider !== null}
                            className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-md transition-all disabled:opacity-50"
                          >
                            {connectingProvider === 'microsoft' ? (
                              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                            ) : (
                              <MicrosoftIcon />
                            )}
                            <span className="font-medium text-gray-700 dark:text-neutral-300">
                              {connectingProvider === 'microsoft' ? 'Conectando...' : 'Outlook'}
                            </span>
                          </button>
                        </div>
                      )}

                      {!connectedEmail && (
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-3 text-center">
                          Al conectar, autorizas a Tazk a enviar correos en tu nombre
                        </p>
                      )}
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
                          { id: 'create', field: 'notify_on_create', label: 'Tarea creada', desc: 'Al crear una nueva tarea', icon: FileText, value: notifyOnCreate, setter: setNotifyOnCreate, color: 'yellow' },
                          { id: 'assign', field: 'notify_on_assign', label: 'Tarea asignada', desc: 'Al asignar a un usuario', icon: UserCheck, value: notifyOnAssign, setter: setNotifyOnAssign, color: 'blue' },
                          { id: 'complete', field: 'notify_on_complete', label: 'Completada', desc: 'Al marcar como completada', icon: CheckCircle, value: notifyOnComplete, setter: setNotifyOnComplete, color: 'emerald' },
                        ].map(trigger => {
                          const Icon = trigger.icon
                          return (
                            <div
                              key={trigger.id}
                              onClick={() => { trigger.setter(!trigger.value); updateSetting(trigger.field, !trigger.value) }}
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
                          disabled={sendingTest || !testEmail.trim() || !connectedEmail}
                          title={!connectedEmail ? 'Conecta una cuenta de correo primero' : ''}
                          className="px-5 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
