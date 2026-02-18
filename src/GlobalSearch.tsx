import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { Task, Contact } from './types/database.types'
import { Search, X, FileText, BookUser, RotateCcw } from 'lucide-react'

interface GlobalSearchProps {
  currentUserId: string
  teamId: string | null
  onClose: () => void
  onOpenTask: (task: Task) => void
  onNavigate: (view: string) => void
}

interface RecurringTask {
  id: string
  title: string
  frequency: string
}

function GlobalSearch({ currentUserId, teamId, onClose, onOpenTask, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    inputRef.current?.focus()
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setTasks([])
      setContacts([])
      setRecurringTasks([])
      setSelectedIndex(0)
      return
    }

    const timer = setTimeout(() => {
      performSearch(query.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const performSearch = async (searchTerm: string) => {
    setLoading(true)
    const pattern = `%${searchTerm}%`

    // Build queries based on team context
    let taskQuery = supabase
      .from('tasks')
      .select('*')
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(5)

    let contactQuery = supabase
      .from('contacts')
      .select('*')
      .or(`name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`)
      .order('name')
      .limit(5)

    let recurringQuery = supabase
      .from('recurring_tasks')
      .select('id, title, frequency')
      .ilike('title', pattern)
      .limit(3)

    if (teamId) {
      taskQuery = taskQuery.eq('team_id', teamId)
      contactQuery = contactQuery.eq('team_id', teamId)
      recurringQuery = recurringQuery.eq('team_id', teamId)
    } else {
      taskQuery = taskQuery.eq('user_id', currentUserId).is('team_id', null)
      contactQuery = contactQuery.eq('user_id', currentUserId).is('team_id', null)
      recurringQuery = recurringQuery.eq('user_id', currentUserId).is('team_id', null)
    }

    const [tasksRes, contactsRes, recurringRes] = await Promise.all([
      taskQuery,
      contactQuery,
      recurringQuery
    ])

    setTasks(tasksRes.data || [])
    setContacts(contactsRes.data || [])
    setRecurringTasks(recurringRes.data || [])
    setSelectedIndex(0)
    setLoading(false)
  }

  // All results flattened for keyboard navigation
  const allResults = [
    ...tasks.map(t => ({ type: 'task' as const, item: t })),
    ...contacts.map(c => ({ type: 'contact' as const, item: c })),
    ...recurringTasks.map(r => ({ type: 'recurring' as const, item: r })),
  ]

  const handleSelect = useCallback((result: typeof allResults[number]) => {
    if (result.type === 'task') {
      onOpenTask(result.item as Task)
    } else if (result.type === 'contact') {
      onNavigate('contacts')
    } else if (result.type === 'recurring') {
      onNavigate('routines')
    }
    handleClose()
  }, [onOpenTask, onNavigate])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault()
      handleSelect(allResults[selectedIndex])
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const container = resultsRef.current
    if (!container) return
    const selected = container.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const hasResults = allResults.length > 0
  const hasQuery = query.trim().length > 0

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Diaria'
      case 'weekly': return 'Semanal'
      case 'monthly': return 'Mensual'
      case 'yearly': return 'Anual'
      default: return freq
    }
  }

  let resultIndex = 0

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] pointer-events-none">
        <div
          className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden pointer-events-auto transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-700">
            <Search className="w-5 h-5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Buscar tareas, contactos, rutinas..."
              className="flex-1 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none text-base"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {hasQuery && (
            <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    No se encontraron resultados para "<span className="font-medium">{query}</span>"
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Tasks */}
                  {tasks.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Tareas
                      </p>
                      {tasks.map((task) => {
                        const idx = resultIndex++
                        return (
                          <button
                            key={`task-${task.id}`}
                            data-selected={idx === selectedIndex}
                            onClick={() => handleSelect({ type: 'task', item: task })}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              idx === selectedIndex
                                ? 'bg-yellow-50 dark:bg-yellow-400/10'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-neutral-900 dark:text-white truncate">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{task.description}</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Contacts */}
                  {contacts.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Contactos
                      </p>
                      {contacts.map((contact) => {
                        const idx = resultIndex++
                        return (
                          <button
                            key={`contact-${contact.id}`}
                            data-selected={idx === selectedIndex}
                            onClick={() => handleSelect({ type: 'contact', item: contact })}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              idx === selectedIndex
                                ? 'bg-yellow-50 dark:bg-yellow-400/10'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                            }`}
                          >
                            <BookUser className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-neutral-900 dark:text-white truncate">{contact.name}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                {[contact.email, contact.company].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Recurring Tasks */}
                  {recurringTasks.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Rutinas
                      </p>
                      {recurringTasks.map((rt) => {
                        const idx = resultIndex++
                        return (
                          <button
                            key={`recurring-${rt.id}`}
                            data-selected={idx === selectedIndex}
                            onClick={() => handleSelect({ type: 'recurring', item: rt as any })}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              idx === selectedIndex
                                ? 'bg-yellow-50 dark:bg-yellow-400/10'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                            }`}
                          >
                            <RotateCcw className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-neutral-900 dark:text-white truncate">{rt.title}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">{frequencyLabel(rt.frequency)}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          {!hasQuery && (
            <div className="p-4 flex items-center justify-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono text-[10px]">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono text-[10px]">↵</kbd>
                abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded font-mono text-[10px]">ESC</kbd>
                cerrar
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default GlobalSearch
