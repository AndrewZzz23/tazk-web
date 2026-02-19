import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabaseClient'
import { TaskComment } from './types/database.types'
import Toast from './Toast'
import { logCommentAdded, logCommentRemoved } from './lib/activityLogger'

interface TaskAttachmentsProps {
  taskId: string
  currentUserId: string
  teamId?: string | null
  userEmail?: string
  canEdit?: boolean
  taskTitle?: string
  taskAssignedTo?: string | null
  taskCreatedBy?: string | null
}

type ProfileMap = Record<string, { full_name: string | null; email: string }>

function TaskAttachments({ taskId, currentUserId, teamId, userEmail, canEdit = true, taskTitle, taskAssignedTo, taskCreatedBy }: TaskAttachmentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [profiles, setProfiles] = useState<ProfileMap>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TaskComment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const stopPropagation = useCallback((e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  useEffect(() => {
    loadComments()
  }, [taskId])

  const loadComments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando comentarios:', error)
    } else {
      setComments(data || [])
      // Load profiles for all unique user_ids
      const userIds = [...new Set((data || []).map(c => c.user_id))]
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        if (profileData) {
          const map: ProfileMap = {}
          profileData.forEach(p => { map[p.id] = { full_name: p.full_name, email: p.email } })
          setProfiles(map)
        }
      }
    }
    setLoading(false)
  }

  const handleSend = async () => {
    const text = newComment.trim()
    if (!text && !pendingFile) return

    setSending(true)

    let filePath: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null
    let fileSize: number | null = null

    // Upload file if attached
    if (pendingFile) {
      if (pendingFile.size > 10 * 1024 * 1024) {
        showToast(`${pendingFile.name} es muy grande (máx 10MB)`, 'error')
        setSending(false)
        return
      }

      const fileExt = pendingFile.name.split('.').pop()
      filePath = `${currentUserId}/${taskId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, pendingFile)

      if (uploadError) {
        showToast(`Error subiendo ${pendingFile.name}`, 'error')
        console.error(uploadError)
        setSending(false)
        return
      }

      fileName = pendingFile.name
      fileType = pendingFile.type
      fileSize = pendingFile.size
    }

    // Save comment to DB
    const { data, error: dbError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: currentUserId,
        content: text || null,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize
      })
      .select('*')
      .single()

    if (dbError) {
      showToast('Error guardando comentario', 'error')
      console.error(dbError)
      setSending(false)
      return
    }

    setComments(prev => [...prev, data])
    // Ensure current user profile is in the map
    if (!profiles[currentUserId]) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', currentUserId)
        .single()
      if (profileData) {
        setProfiles(prev => ({ ...prev, [profileData.id]: { full_name: profileData.full_name, email: profileData.email } }))
      }
    }
    setNewComment('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSending(false)

    // Scroll to bottom
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }, 50)

    logCommentAdded(data.id, taskId, teamId || null, currentUserId, userEmail, !!filePath)

    // Insertar notificación in-app para asignado y creador (excluyendo al que comenta)
    const commenterName = userEmail || 'Alguien'
    const notifyTitle = taskTitle || 'una tarea'
    const notifBody = filePath
      ? `${commenterName} adjuntó un archivo en "${notifyTitle}"`
      : `${commenterName} comentó en "${notifyTitle}"`
    const toNotify = [...new Set([taskAssignedTo, taskCreatedBy].filter(Boolean))] as string[]
    for (const userId of toNotify) {
      if (userId !== currentUserId) {
        supabase.from('notifications').insert({
          user_id: userId,
          type: 'task_comment',
          title: notifBody,
          body: text || null,
          data: { task_id: taskId },
          is_read: false
        })
      }
    }
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!confirmDelete || deleting) return

    setDeleting(true)

    // Remove file from storage if exists
    if (confirmDelete.file_path) {
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([confirmDelete.file_path])

      if (storageError) {
        console.error('Error eliminando archivo de storage:', storageError)
      }
    }

    // Delete from DB
    const { error: dbError } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', confirmDelete.id)

    if (dbError) {
      showToast('Error eliminando', 'error')
      console.error(dbError)
    } else {
      setComments(prev => prev.filter(c => c.id !== confirmDelete.id))
      showToast('Eliminado', 'success')
      logCommentRemoved(confirmDelete.id, taskId, teamId || null, currentUserId, userEmail)
    }

    setConfirmDelete(null)
    setDeleting(false)
  }

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath)
    return data.publicUrl
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isImage = (fileType: string | null) => fileType?.startsWith('image/') || false

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return '📎'
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('video')) return '🎬'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    return '📎'
  }

  const getInitials = (comment: TaskComment) => {
    const profile = profiles[comment.user_id]
    const name = profile?.full_name || profile?.email || '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const getDisplayName = (comment: TaskComment) => {
    const profile = profiles[comment.user_id]
    return profile?.full_name || profile?.email || 'Usuario'
  }

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'ahora'
    if (diffMin < 60) return `hace ${diffMin}m`
    if (diffHrs < 24) return `hace ${diffHrs}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  const handleTextareaResize = () => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-neutral-700" onClick={stopPropagation}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
          Adjuntos y comentarios
        </span>
        {comments.length > 0 && (
          <span className="text-xs bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-md font-medium">
            {comments.length}
          </span>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-400 dark:text-neutral-500 text-sm gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50/50 dark:bg-neutral-800/30">
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-neutral-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-400 dark:text-neutral-500 text-xs">Sin comentarios ni adjuntos</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3 max-h-[350px] overflow-y-auto pr-1 mb-3">
          {comments.map(comment => (
            <div key={comment.id} className="group flex gap-2.5">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                {getInitials(comment)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Author + time */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-neutral-200 truncate">
                    {getDisplayName(comment)}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-neutral-500 flex-shrink-0">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                  {/* Delete button */}
                  {canEdit && comment.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(comment) }}
                      className="p-0.5 text-gray-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-auto flex-shrink-0"
                      title="Eliminar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Text content */}
                {comment.content && (
                  <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}

                {/* File attachment */}
                {comment.file_path && comment.file_name && (
                  <div className="mt-1.5">
                    {isImage(comment.file_type) ? (
                      <div
                        className="relative max-w-[140px] rounded-lg overflow-hidden cursor-pointer ring-1 ring-gray-200 dark:ring-neutral-600 hover:ring-yellow-400 transition-all"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(getFileUrl(comment.file_path!)) }}
                      >
                        <img
                          src={getFileUrl(comment.file_path)}
                          alt={comment.file_name}
                          className="w-full h-auto max-h-[120px] object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1">
                          <p className="text-[10px] text-white truncate">{comment.file_name}</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-neutral-800/50 rounded-lg ring-1 ring-gray-100 dark:ring-neutral-700/50 hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); window.open(getFileUrl(comment.file_path!), '_blank') }}
                      >
                        <span className="text-sm">{getFileIcon(comment.file_type)}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 dark:text-neutral-200 truncate max-w-[180px]">{comment.file_name}</p>
                          {comment.file_size && (
                            <p className="text-[10px] text-gray-400 dark:text-neutral-500">{formatFileSize(comment.file_size)}</p>
                          )}
                        </div>
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      {canEdit && (
        <div className="border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800/50 overflow-hidden">
          {/* Pending file chip */}
          {pendingFile && (
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
                <span>{getFileIcon(pendingFile.type)}</span>
                <span className="truncate max-w-[180px]">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="p-0.5 hover:text-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1.5 p-2">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => { setNewComment(e.target.value); handleTextareaResize() }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un comentario..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 resize-none outline-none px-2 py-1.5 max-h-[120px]"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Cancel button - visible when there is draft content */}
            {(newComment.trim() || pendingFile) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setNewComment(''); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors flex-shrink-0"
                title="Cancelar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Attach button */}
            <label className="cursor-pointer p-2 text-gray-400 dark:text-neutral-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPendingFile(file)
                }}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>

            {/* Send button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSend() }}
              disabled={sending || (!newComment.trim() && !pendingFile)}
              className="p-2 text-white bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 dark:disabled:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-neutral-500 rounded-lg transition-colors flex-shrink-0"
            >
              {sending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Image preview modal - portaled to body so it renders outside the side panel */}
      {previewImage && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={previewImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Descargar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button
              type="button"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Eliminar</h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                  {confirmDelete.content
                    ? `¿Eliminar este comentario${confirmDelete.file_name ? ' y su archivo adjunto' : ''}?`
                    : `¿Eliminar "${confirmDelete.file_name}"?`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  )
}

export default TaskAttachments
