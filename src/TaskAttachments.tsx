import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { TaskAttachment } from './types/database.types'
import Toast from './Toast'

interface TaskAttachmentsProps {
  taskId: string
  currentUserId: string
  canEdit?: boolean
}

function TaskAttachments({ taskId, currentUserId, canEdit = true }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TaskAttachment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prevenir propagación de eventos al contenedor padre
  const stopPropagation = useCallback((e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  useEffect(() => {
    loadAttachments()
  }, [taskId])

  const loadAttachments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando archivos:', error)
    } else {
      setAttachments(data || [])
    }
    setLoading(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (const file of Array.from(files)) {
      await uploadFile(file)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFile = async (file: File) => {
    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name} es muy grande (máx 10MB)`, 'error')
      return
    }

    // Crear path único
    const fileExt = file.name.split('.').pop()
    const fileName = `${currentUserId}/${taskId}/${Date.now()}.${fileExt}`

    // Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file)

    if (uploadError) {
      showToast(`Error subiendo ${file.name}`, 'error')
      console.error(uploadError)
      return
    }

    // Guardar en base de datos
    const { data, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: currentUserId
      })
      .select()
      .single()

    if (dbError) {
      showToast(`Error guardando ${file.name}`, 'error')
      console.error(dbError)
      return
    }

    setAttachments(prev => [data, ...prev])
    showToast(`${file.name} subido`, 'success')
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!confirmDelete || deleting) return

    setDeleting(true)

    // Eliminar de Storage
    const { error: storageError } = await supabase.storage
      .from('task-attachments')
      .remove([confirmDelete.file_path])

    if (storageError) {
      showToast('Error eliminando archivo', 'error')
      console.error(storageError)
      setConfirmDelete(null)
      setDeleting(false)
      return
    }

    // Eliminar de base de datos
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', confirmDelete.id)

    if (dbError) {
      showToast('Error eliminando registro', 'error')
      console.error(dbError)
    } else {
      setAttachments(prev => prev.filter(a => a.id !== confirmDelete.id))
      showToast('Archivo eliminado', 'success')
    }

    setConfirmDelete(null)
    setDeleting(false)
  }

  const handleCancelDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setConfirmDelete(null)
  }

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath)
    return data.publicUrl
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isImage = (fileType: string) => fileType.startsWith('image/')

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('video')) return '🎬'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    return '📎'
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-neutral-700" onClick={stopPropagation}>
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
            Adjuntos
          </span>
          {attachments.length > 0 && (
            <span className="text-xs bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-md font-medium">
              {attachments.length}
            </span>
          )}
        </div>

        {canEdit && (
          <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 rounded-md text-xs font-medium hover:bg-yellow-400 hover:text-neutral-900 transition-all duration-200 flex items-center gap-1.5">
              {uploading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Subiendo...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </>
              )}
            </span>
          </label>
        )}
      </div>

      {/* Lista de archivos */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-400 dark:text-neutral-500 text-sm gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50/50 dark:bg-neutral-800/30">
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-neutral-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400 dark:text-neutral-500 text-xs">Sin archivos adjuntos</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Grid de imágenes - más compacto */}
          {attachments.filter(a => isImage(a.file_type)).length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {attachments.filter(a => isImage(a.file_type)).map(attachment => (
                <div
                  key={attachment.id}
                  className="relative group aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-neutral-700 cursor-pointer ring-1 ring-gray-200 dark:ring-neutral-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewImage(getFileUrl(attachment.file_path))
                  }}
                >
                  <img
                    src={getFileUrl(attachment.file_path)}
                    alt={attachment.file_name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(getFileUrl(attachment.file_path), '_blank')
                        }}
                        className="p-1 bg-white/90 rounded text-gray-700 hover:bg-yellow-400 transition-colors"
                        title="Descargar"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {canEdit && attachment.uploaded_by === currentUserId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(attachment)
                          }}
                          className="p-1 bg-white/90 rounded text-gray-700 hover:bg-red-500 hover:text-white transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lista de otros archivos - más compacta */}
          {attachments.filter(a => !isImage(a.file_type)).map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-neutral-800/50 rounded-md group hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors ring-1 ring-gray-100 dark:ring-neutral-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">{getFileIcon(attachment.file_type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-neutral-200 truncate">{attachment.file_name}</p>
                <p className="text-[10px] text-gray-400 dark:text-neutral-500">{formatFileSize(attachment.file_size)}</p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={getFileUrl(attachment.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-400/10 rounded transition-colors"
                  title="Descargar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                {canEdit && attachment.uploaded_by === currentUserId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete(attachment)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview de imagen */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation()
            setPreviewImage(null)
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setPreviewImage(null)
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Confirm delete - inline para evitar problemas de propagación */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"
          onClick={handleCancelDelete}
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
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Eliminar archivo</h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                  ¿Eliminar "<span className="font-medium text-gray-700 dark:text-neutral-300">{confirmDelete.file_name}</span>"?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancelDelete}
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