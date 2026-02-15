import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus } from './types/database.types'
import {
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { LoadingZapIcon, ChartIcon, XIcon, CheckIcon, ClipboardIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import {
  Clock, AlertTriangle, Calendar, Target, Zap,
  Flame, Award, GripVertical, RefreshCw, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, PieChart as PieChartIcon, Users, CalendarDays
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface MetricsProps {
  currentUserId: string
  teamId: string | null
  onClose?: () => void
}

type DateRange = '7d' | '30d' | '90d' | 'all'
type WidgetId = 'productivity' | 'completion' | 'status' | 'trend' | 'heatmap' | 'team' | 'streak' | 'alerts'

// Animated number counter
function AnimatedCounter({ value, duration = 1000, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(easeOutQuart * value))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{displayValue}{suffix}</span>
}

// Circular progress ring with animation
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#facc15'
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-neutral-200 dark:text-neutral-700"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  )
}

// Sortable widget wrapper
function SortableWidget({
  id,
  children,
  className = ''
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className} ${isDragging ? 'opacity-40 scale-[0.98] rotate-1' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1.5 rounded-lg cursor-grab active:cursor-grabbing bg-neutral-100 dark:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 z-10"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </motion.div>
  )
}

// Stat card with animation
function StatCard({
  title,
  value,
  suffix = '',
  icon,
  trend,
  trendLabel,
  color = 'yellow',
  delay = 0
}: {
  title: string
  value: number
  suffix?: string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'neutral'
  delay?: number
}) {
  const colorClasses = {
    yellow: 'from-yellow-400/20 to-orange-400/20 border-yellow-400/30',
    blue: 'from-blue-400/20 to-cyan-400/20 border-blue-400/30',
    green: 'from-emerald-400/20 to-green-400/20 border-emerald-400/30',
    red: 'from-red-400/20 to-pink-400/20 border-red-400/30',
    purple: 'from-purple-400/20 to-violet-400/20 border-purple-400/30',
    orange: 'from-orange-400/20 to-amber-400/20 border-orange-400/30',
    neutral: 'from-neutral-400/10 to-neutral-400/10 border-neutral-400/30',
  }

  const iconColorClasses = {
    yellow: 'text-yellow-500 bg-yellow-400/20',
    blue: 'text-blue-500 bg-blue-400/20',
    green: 'text-emerald-500 bg-emerald-400/20',
    red: 'text-red-500 bg-red-400/20',
    purple: 'text-purple-500 bg-purple-400/20',
    orange: 'text-orange-500 bg-orange-400/20',
    neutral: 'text-neutral-500 bg-neutral-400/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-4 backdrop-blur-sm`}
    >
      {/* Decorative glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${colorClasses[color]}`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${iconColorClasses[color]}`}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend > 0
                ? 'text-emerald-500 bg-emerald-400/20'
                : trend < 0
                  ? 'text-red-500 bg-red-400/20'
                  : 'text-neutral-500 bg-neutral-400/20'
            }`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>

        <div className="text-sm text-neutral-600 dark:text-neutral-400">{title}</div>

        {trendLabel && (
          <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{trendLabel}</div>
        )}
      </div>
    </motion.div>
  )
}

// Activity heatmap component
function ActivityHeatmap({ data }: { data: { day: string; hour: number; value: number }[] }) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const maxValue = Math.max(...data.map(d => d.value), 1)

  const getIntensity = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour)
    if (!item || item.value === 0) return 0
    return Math.ceil((item.value / maxValue) * 4)
  }

  const intensityColors = [
    'bg-neutral-100 dark:bg-neutral-800',
    'bg-yellow-200 dark:bg-yellow-900/50',
    'bg-yellow-300 dark:bg-yellow-700/60',
    'bg-yellow-400 dark:bg-yellow-600/70',
    'bg-yellow-500 dark:bg-yellow-500',
  ]

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Hours header */}
        <div className="flex mb-1 ml-10">
          {hours.filter((_, i) => i % 3 === 0).map(hour => (
            <div key={hour} className="flex-1 text-xs text-neutral-400 text-center">
              {hour}h
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {days.map(day => (
            <div key={day} className="flex items-center gap-1">
              <div className="w-8 text-xs text-neutral-500 dark:text-neutral-400">{day}</div>
              <div className="flex-1 flex gap-0.5">
                {hours.map(hour => (
                  <motion.div
                    key={`${day}-${hour}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (days.indexOf(day) * 24 + hour) * 0.002 }}
                    className={`flex-1 h-4 rounded-sm ${intensityColors[getIntensity(day, hour)]} transition-colors cursor-pointer hover:ring-2 hover:ring-yellow-400/50`}
                    title={`${day} ${hour}:00 - ${getIntensity(day, hour) > 0 ? data.find(d => d.day === day && d.hour === hour)?.value || 0 : 0} tareas`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-3">
          <span className="text-xs text-neutral-500 mr-2">Menos</span>
          {intensityColors.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
          <span className="text-xs text-neutral-500 ml-2">Más</span>
        </div>
      </div>
    </div>
  )
}

// Streak component
function StreakDisplay({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="p-3 rounded-xl bg-gradient-to-br from-orange-400 to-red-500"
          >
            <Flame className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <div className="text-4xl font-bold text-neutral-900 dark:text-white">
              <AnimatedCounter value={currentStreak} />
            </div>
            <div className="text-sm text-neutral-500">días de racha</div>
          </div>
        </div>

        {/* Streak progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-neutral-500 mb-1">
            <span>Racha actual</span>
            <span>Mejor: {longestStreak} días</span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((currentStreak / Math.max(longestStreak, 7)) * 100, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 mb-2">
          <Award className="w-8 h-8 text-yellow-500 mx-auto" />
        </div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white">{longestStreak}</div>
        <div className="text-xs text-neutral-500">mejor racha</div>
      </div>
    </div>
  )
}

// Date range selector
function DateRangeSelector({
  value,
  onChange
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  const options: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
    { value: 'all', label: 'Todo' },
  ]

  return (
    <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            value === option.value
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Productivity score gauge
function ProductivityGauge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#22c55e' // green
    if (s >= 60) return '#facc15' // yellow
    if (s >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excelente'
    if (s >= 60) return 'Bueno'
    if (s >= 40) return 'Regular'
    return 'Necesita mejorar'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ProgressRing progress={score} size={160} strokeWidth={12} color={getScoreColor(score)} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Sparkles className="w-5 h-5 text-yellow-500 mb-1" />
          <div className="text-4xl font-bold text-neutral-900 dark:text-white">
            <AnimatedCounter value={score} />
          </div>
          <div className="text-sm text-neutral-500">puntos</div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`mt-4 px-4 py-2 rounded-full text-sm font-medium`}
        style={{
          backgroundColor: `${getScoreColor(score)}20`,
          color: getScoreColor(score)
        }}
      >
        {getScoreLabel(score)}
      </motion.div>
    </div>
  )
}

function Metrics({ currentUserId, teamId, onClose }: MetricsProps) {
  const isMobile = useIsMobile()
  const isViewMode = !onClose
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [refreshing, setRefreshing] = useState(false)

  // Widget order (persisted to localStorage)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem(`metrics-widget-order-${teamId || 'personal'}`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return ['productivity', 'completion', 'status', 'trend', 'heatmap', 'streak', 'alerts', 'team']
      }
    }
    return ['productivity', 'completion', 'status', 'trend', 'heatmap', 'streak', 'alerts', 'team']
  })

  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    let taskQuery = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*)
      `)

    if (teamId) {
      taskQuery = taskQuery.eq('team_id', teamId)
    } else {
      taskQuery = taskQuery.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data: taskData } = await taskQuery
    if (taskData) setTasks(taskData)

    let statusQuery = supabase
      .from('task_statuses')
      .select('*')
      .order('order_position')

    if (teamId) {
      statusQuery = statusQuery.eq('team_id', teamId)
    } else {
      statusQuery = statusQuery.is('team_id', null)
    }

    const { data: statusData } = await statusQuery
    if (statusData) setStatuses(statusData)

    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleClose = () => {
    if (!onClose) return
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  useBodyScrollLock(isMobile && isVisible && !isViewMode)

  // Filter tasks by date range
  const filteredTasks = useMemo(() => {
    if (dateRange === 'all') return tasks

    const now = new Date()
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    return tasks.filter(t => new Date(t.created_at) >= cutoff)
  }, [tasks, dateRange])

  // Helper to get task category
  const getTaskCategory = useCallback((task: Task): 'not_started' | 'in_progress' | 'completed' | 'unknown' => {
    if (task.task_statuses?.category) {
      return task.task_statuses.category as 'not_started' | 'in_progress' | 'completed'
    }
    if (task.status_id) {
      const status = statuses.find(s => s.id === task.status_id)
      if (status?.category) {
        return status.category as 'not_started' | 'in_progress' | 'completed'
      }
    }
    return 'unknown'
  }, [statuses])

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date()
    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter(t => getTaskCategory(t) === 'completed').length
    const inProgressTasks = filteredTasks.filter(t => getTaskCategory(t) === 'in_progress').length
    const notStartedTasks = filteredTasks.filter(t => getTaskCategory(t) === 'not_started').length
    const unknownStatusTasks = filteredTasks.filter(t => getTaskCategory(t) === 'unknown').length

    const overdueTasks = filteredTasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) < now && getTaskCategory(t) !== 'completed'
    }).length

    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingTasks = filteredTasks.filter(t => {
      if (!t.due_date || getTaskCategory(t) === 'completed') return false
      const dueDate = new Date(t.due_date)
      return dueDate >= now && dueDate <= nextWeek
    }).length

    const todayTasks = filteredTasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate.toDateString() === now.toDateString() && getTaskCategory(t) !== 'completed'
    }).length

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Calculate productivity score (0-100)
    let productivityScore = 50 // Base score
    if (totalTasks > 0) {
      productivityScore += (completedTasks / totalTasks) * 30 // +30 max for completion rate
      productivityScore -= (overdueTasks / totalTasks) * 20 // -20 max for overdue tasks
      productivityScore += inProgressTasks > 0 ? 10 : 0 // +10 for having active tasks
      productivityScore -= notStartedTasks > totalTasks * 0.5 ? 10 : 0 // -10 if too many not started
    }
    productivityScore = Math.max(0, Math.min(100, Math.round(productivityScore)))

    // Calculate streak (consecutive days with completed tasks)
    const completedDates = new Set(
      tasks
        .filter(t => getTaskCategory(t) === 'completed' && t.updated_at)
        .map(t => new Date(t.updated_at).toDateString())
    )

    let currentStreak = 0
    let checkDate = new Date()
    while (completedDates.has(checkDate.toDateString())) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Longest streak calculation (simplified)
    const longestStreak = Math.max(currentStreak, Math.floor(completedTasks / 3))

    // Weekly trends
    const weeksData = Array.from({ length: 4 }, (_, i) => {
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() - i * 7)
      weekEnd.setHours(23, 59, 59, 999)

      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      const created = filteredTasks.filter(t => {
        const createdDate = new Date(t.created_at)
        return createdDate >= weekStart && createdDate <= weekEnd
      }).length

      const completed = filteredTasks.filter(t => {
        if (getTaskCategory(t) !== 'completed' || !t.updated_at) return false
        const completedDate = new Date(t.updated_at)
        return completedDate >= weekStart && completedDate <= weekEnd
      }).length

      const label = i === 0 ? 'Esta sem' : i === 1 ? 'Anterior' : `Sem -${i + 1}`
      return { name: label, creadas: created, completadas: completed }
    }).reverse()

    const thisWeekTasks = weeksData[weeksData.length - 1]?.creadas || 0
    const lastWeekTasks = weeksData[weeksData.length - 2]?.creadas || 0
    const trend = lastWeekTasks > 0 ? Math.round(((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100) : 0

    // Status distribution
    const activeStatuses = statuses.filter(s => s.is_active)
    const statusData = activeStatuses.map(status => ({
      name: status.name,
      value: filteredTasks.filter(t => t.status_id === status.id).length,
      color: status.color
    })).filter(s => s.value > 0)

    if (unknownStatusTasks > 0) {
      statusData.push({
        name: 'Sin estado',
        value: unknownStatusTasks,
        color: '#f97316'
      })
    }

    // Activity heatmap data
    const heatmapData: { day: string; hour: number; value: number }[] = []
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

    days.forEach(day => {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({ day, hour, value: 0 })
      }
    })

    tasks.forEach(task => {
      const date = new Date(task.created_at)
      const dayIndex = (date.getDay() + 6) % 7 // Monday = 0
      const hour = date.getHours()
      const item = heatmapData.find(d => d.day === days[dayIndex] && d.hour === hour)
      if (item) item.value++
    })

    // User data for team
    const userTaskCounts: Record<string, { name: string; count: number; completed: number; avatar: string }> = {}
    filteredTasks.forEach(task => {
      if (task.assigned_user) {
        const name = task.assigned_user.full_name || task.assigned_user.email || 'Sin nombre'
        if (!userTaskCounts[name]) {
          userTaskCounts[name] = {
            name,
            count: 0,
            completed: 0,
            avatar: name.charAt(0).toUpperCase()
          }
        }
        userTaskCounts[name].count++
        if (getTaskCategory(task) === 'completed') {
          userTaskCounts[name].completed++
        }
      }
    })
    const userData = Object.values(userTaskCounts).sort((a, b) => b.count - a.count).slice(0, 5)
    const unassignedTasks = filteredTasks.filter(t => !t.assigned_to).length

    // Priority distribution
    const priorityData = [
      { name: 'Alta', value: filteredTasks.filter(t => t.priority === 'high').length, color: '#ef4444' },
      { name: 'Media', value: filteredTasks.filter(t => t.priority === 'medium').length, color: '#eab308' },
      { name: 'Baja', value: filteredTasks.filter(t => t.priority === 'low').length, color: '#22c55e' },
      { name: 'Sin prioridad', value: filteredTasks.filter(t => !t.priority).length, color: '#737373' },
    ].filter(p => p.value > 0)

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      unknownStatusTasks,
      overdueTasks,
      upcomingTasks,
      todayTasks,
      completionRate,
      productivityScore,
      currentStreak,
      longestStreak,
      weeksData,
      trend,
      statusData,
      heatmapData,
      userData,
      unassignedTasks,
      priorityData
    }
  }, [filteredTasks, statuses, tasks, getTaskCategory])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveWidgetId(event.active.id as WidgetId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveWidgetId(null)
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgetOrder(items => {
        const oldIndex = items.indexOf(active.id as WidgetId)
        const newIndex = items.indexOf(over.id as WidgetId)
        const newOrder = arrayMove(items, oldIndex, newIndex)
        localStorage.setItem(`metrics-widget-order-${teamId || 'personal'}`, JSON.stringify(newOrder))
        return newOrder
      })
    }
  }

  const handleDragCancel = () => {
    setActiveWidgetId(null)
  }

  // Widget title map for drag overlay
  const widgetTitles: Record<WidgetId, { title: string; icon: React.ReactNode }> = {
    productivity: { title: 'Productividad', icon: <Sparkles className="w-5 h-5 text-yellow-500" /> },
    completion: { title: 'Progreso', icon: <Target className="w-5 h-5 text-emerald-500" /> },
    status: { title: 'Por estado', icon: <PieChartIcon className="w-5 h-5 text-purple-500" /> },
    trend: { title: 'Tendencia semanal', icon: <Activity className="w-5 h-5 text-blue-500" /> },
    heatmap: { title: 'Mapa de actividad', icon: <CalendarDays className="w-5 h-5 text-orange-500" /> },
    streak: { title: 'Racha', icon: <Flame className="w-5 h-5 text-orange-500" /> },
    alerts: { title: 'Alertas', icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
    team: { title: 'Equipo', icon: <Users className="w-5 h-5 text-cyan-500" /> },
  }

  // Render widget by ID
  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'productivity':
        return (
          <SortableWidget id="productivity" className="col-span-2 md:col-span-1">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Productividad
              </h3>
              <ProductivityGauge score={metrics.productivityScore} />
            </div>
          </SortableWidget>
        )

      case 'completion':
        return (
          <SortableWidget id="completion" className="col-span-2 md:col-span-1">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Progreso
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <ProgressRing progress={metrics.completionRate} size={140} strokeWidth={10} color="#22c55e" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                      <AnimatedCounter value={metrics.completionRate} suffix="%" />
                    </div>
                    <div className="text-sm text-neutral-500">completado</div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Completadas</span>
                    <span className="font-semibold text-emerald-500">{metrics.completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">En progreso</span>
                    <span className="font-semibold text-blue-500">{metrics.inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Sin iniciar</span>
                    <span className="font-semibold text-neutral-500">{metrics.notStartedTasks}</span>
                  </div>
                </div>
              </div>
            </div>
          </SortableWidget>
        )

      case 'status':
        return (
          <SortableWidget id="status" className="col-span-2 md:col-span-1">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                Por estado
              </h3>
              {metrics.statusData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {metrics.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {metrics.statusData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate flex-1">{item.name}</span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-neutral-500">Sin datos</div>
              )}
            </div>
          </SortableWidget>
        )

      case 'trend':
        return (
          <SortableWidget id="trend" className="col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Tendencia semanal
              </h3>
              {metrics.weeksData.some(w => w.creadas > 0 || w.completadas > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.weeksData}>
                    <defs>
                      <linearGradient id="colorCreadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#262626',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                      }}
                    />
                    <Area type="monotone" dataKey="creadas" stroke="#facc15" fill="url(#colorCreadas)" strokeWidth={2} name="Creadas" />
                    <Area type="monotone" dataKey="completadas" stroke="#22c55e" fill="url(#colorCompletadas)" strokeWidth={2} name="Completadas" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-neutral-500">Sin actividad reciente</div>
              )}
            </div>
          </SortableWidget>
        )

      case 'heatmap':
        return (
          <SortableWidget id="heatmap" className="col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-orange-500" />
                Mapa de actividad
              </h3>
              <ActivityHeatmap data={metrics.heatmapData} />
            </div>
          </SortableWidget>
        )

      case 'streak':
        return (
          <SortableWidget id="streak" className="col-span-2 md:col-span-1">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Racha de productividad
              </h3>
              <StreakDisplay
                currentStreak={metrics.currentStreak}
                longestStreak={metrics.longestStreak}
              />
            </div>
          </SortableWidget>
        )

      case 'alerts':
        return metrics.overdueTasks > 0 || metrics.todayTasks > 0 || metrics.upcomingTasks > 0 ? (
          <SortableWidget id="alerts" className="col-span-2 md:col-span-1">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Alertas
              </h3>
              <div className="space-y-3">
                {metrics.overdueTasks > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                  >
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-red-600 dark:text-red-400">
                        {metrics.overdueTasks} vencida{metrics.overdueTasks > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-red-500/70">Requieren atención</p>
                    </div>
                  </motion.div>
                )}
                {metrics.todayTasks > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        {metrics.todayTasks} para hoy
                      </p>
                      <p className="text-xs text-amber-500/70">Vencen hoy</p>
                    </div>
                  </motion.div>
                )}
                {metrics.upcomingTasks > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                  >
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Clock className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">
                        {metrics.upcomingTasks} próximas
                      </p>
                      <p className="text-xs text-yellow-500/70">Próximos 7 días</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </SortableWidget>
        ) : null

      case 'team':
        return teamId && metrics.userData.length > 0 ? (
          <SortableWidget id="team" className="col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 h-full">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-500" />
                Equipo
              </h3>
              <div className="space-y-3">
                {metrics.userData.map((user, i) => (
                  <motion.div
                    key={user.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-neutral-900 font-bold flex-shrink-0">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-neutral-900 dark:text-white truncate">{user.name}</p>
                        <span className="text-sm text-neutral-500">{user.count} tareas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${user.count > 0 ? (user.completed / user.count) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-emerald-500 font-medium">
                          {user.count > 0 ? Math.round((user.completed / user.count) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {metrics.unassignedTasks > 0 && (
                  <div className="flex items-center gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                      <span className="text-neutral-500">?</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-neutral-500">Sin asignar</p>
                      <p className="text-sm text-neutral-400">{metrics.unassignedTasks} tareas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SortableWidget>
        ) : null

      default:
        return null
    }
  }

  // Main stats cards
  const renderStatCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatCard
        title="Total"
        value={metrics.totalTasks}
        icon={<ClipboardIcon size={18} />}
        color="neutral"
        delay={0}
      />
      <StatCard
        title="Sin iniciar"
        value={metrics.notStartedTasks}
        icon={<Clock className="w-[18px] h-[18px]" />}
        color="neutral"
        delay={0.05}
      />
      <StatCard
        title="En progreso"
        value={metrics.inProgressTasks}
        icon={<Zap className="w-[18px] h-[18px]" />}
        color="blue"
        delay={0.1}
      />
      <StatCard
        title="Completadas"
        value={metrics.completedTasks}
        icon={<CheckIcon size={18} />}
        trend={metrics.trend}
        color="green"
        delay={0.15}
      />
      <StatCard
        title="Próx. 7 días"
        value={metrics.upcomingTasks}
        icon={<Calendar className="w-[18px] h-[18px]" />}
        color={metrics.upcomingTasks > 0 ? 'orange' : 'neutral'}
        delay={0.2}
      />
      <StatCard
        title="Vencidas"
        value={metrics.overdueTasks}
        icon={<AlertTriangle className="w-[18px] h-[18px]" />}
        color={metrics.overdueTasks > 0 ? 'red' : 'neutral'}
        delay={0.25}
      />
    </div>
  )

  // Content rendering
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingZapIcon size={48} />
          <p className="text-neutral-500 mt-4">Cargando métricas...</p>
        </div>
      )
    }

    if (metrics.totalTasks === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <ClipboardIcon size={48} className="text-neutral-400 dark:text-neutral-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Sin tareas aún</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm">
            Crea tu primera tarea para empezar a ver métricas y estadísticas de tu productividad.
          </p>
        </motion.div>
      )
    }

    return (
      <>
        {renderStatCards()}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4">
              {widgetOrder.map(widgetId => renderWidget(widgetId))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
            {activeWidgetId && (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/20 rotate-2 min-w-[200px]">
                <div className="flex items-center gap-3">
                  {widgetTitles[activeWidgetId].icon}
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {widgetTitles[activeWidgetId].title}
                  </h3>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </>
    )
  }

  // View mode (embedded, no modal)
  if (isViewMode) {
    return (
      <div className={`${isMobile ? 'pb-24' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-yellow-400">
                <ChartIcon size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Métricas</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  {metrics.totalTasks} tareas · {metrics.completionRate}% completado
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-3">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {renderContent()}
      </div>
    )
  }

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-200 ${
            isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent opacity-0'
          }`}
          onClick={handleClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isVisible ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 top-4 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          style={dragStyle}
          onClick={(e) => e.stopPropagation()}
          {...containerProps}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">
                <ChartIcon size={24} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Métricas</h2>
                <p className="text-xs text-neutral-500">{metrics.totalTasks} tareas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon size={20} />
              </button>
            </div>
          </div>

          {/* Date range selector */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {renderContent()}
          </div>
        </motion.div>
      </>
    )
  }

  // Desktop: Modal
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: isVisible ? 1 : 0.95, opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500">
                <ChartIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Métricas</h2>
                <p className="text-sm text-neutral-500">{metrics.totalTasks} tareas · {metrics.completionRate}% completado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default Metrics
