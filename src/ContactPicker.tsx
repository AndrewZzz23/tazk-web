import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { Contact } from './types/database.types'
import { useIsMobile } from './hooks/useIsMobile'
import { BookUser, Search, Check, X } from 'lucide-react'

interface ContactPickerProps {
  currentUserId: string
  teamId: string | null
  selectedEmails: string[]
  maxEmails: number
  onEmailsChange: (emails: string[]) => void
}

export default function ContactPicker({
  currentUserId,
  teamId,
  selectedEmails,
  maxEmails,
  onEmailsChange,
}: ContactPickerProps) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Load contacts from Supabase
  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('contacts')
        .select('*, contact_labels(*)')
        .order('name')

      if (teamId) {
        query = query.eq('team_id', teamId)
      } else {
        query = query.eq('user_id', currentUserId).is('team_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      setContacts(data ?? [])
    } catch (err) {
      console.error('Error loading contacts:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUserId, teamId])

  // Load contacts when dropdown opens
  useEffect(() => {
    if (open) {
      loadContacts()
      setTimeout(() => searchRef.current?.focus(), 100)
    } else {
      setSearch('')
    }
  }, [open, loadContacts])

  // Close on click outside
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    )
  })

  function toggleContact(email: string) {
    if (selectedEmails.includes(email)) {
      onEmailsChange(selectedEmails.filter((e) => e !== email))
    } else {
      if (selectedEmails.length >= maxEmails) return
      onEmailsChange([...selectedEmails, email])
    }
  }

  const atLimit = selectedEmails.length >= maxEmails

  // Shared contact list content
  const contactList = (
    <>
      {/* Search */}
      <div className="relative px-3 pt-3 pb-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 mt-0.5 w-4 h-4 text-neutral-400" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contacto..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-yellow-400/50"
        />
      </div>

      {/* List */}
      <div className="max-h-60 overflow-y-auto px-1 pb-2">
        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-6">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">Sin resultados</p>
        ) : (
          filtered.map((contact) => {
            const hasEmail = !!contact.email
            const isSelected = hasEmail && selectedEmails.includes(contact.email!)
            const isDisabled = !hasEmail || (atLimit && !isSelected)
            const label = contact.contact_labels

            return (
              <button
                key={contact.id}
                type="button"
                disabled={isDisabled}
                onClick={() => hasEmail && toggleContact(contact.email!)}
                className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-lg text-left transition-colors ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                }`}
              >
                {/* Check indicator */}
                <div
                  className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'border border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {contact.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {hasEmail ? contact.email : 'Sin email'}
                  </p>
                </div>

                {/* Label pill */}
                {label && (
                  <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </>
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
      >
        <BookUser className="w-4 h-4" />
        Seleccionar contacto
      </button>

      {/* Dropdown / Bottom sheet */}
      {open && (
        <>
          {isMobile ? (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setOpen(false)}
              />
              {/* Bottom sheet */}
              <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-800 rounded-t-2xl shadow-xl border-t border-neutral-200 dark:border-neutral-700 max-h-[70vh] flex flex-col animate-slide-up">
                {/* Handle bar + close */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mx-auto" />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute right-3 top-3 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 px-4 pb-1">
                  Seleccionar contacto
                </h3>
                <div className="flex-1 overflow-y-auto">{contactList}</div>
              </div>
            </>
          ) : (
            /* Desktop dropdown */
            <div className="absolute left-0 top-full mt-2 w-80 z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700">
              {contactList}
            </div>
          )}
        </>
      )}
    </div>
  )
}
