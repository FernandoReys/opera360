'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  CalendarDays,
  UsersRound,
  UserRoundCheck,
  FileText,
  WalletCards,
  LogOut,
  Moon,
  Sun,
  Bell,
  TrendingUp,
  DollarSign,
  BriefcaseBusiness,
  UtensilsCrossed,
  Bus,
  Settings,
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  User,
  Calendar,
  CircleHelp,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type PresencasProps = {
  email: string
  fullName: string
  role: string
}

type EventItem = {
  id: string
  name: string
}

type AttendanceItem = {
  id: string
  attendance_status: 'pending' | 'present' | 'absent'
  check_in: string | null
  check_out: string | null
  notes: string | null
}

type ScheduleItem = {
  id: string
  event_id: string
  worker_id: string
  work_date: string
  role_name: string | null
  start_time: string | null
  end_time: string | null
  status: string

  events:
    | {
        id: string
        name: string
      }
    | {
        id: string
        name: string
      }[]
    | null

  workers:
    | {
        id: string
        full_name: string
        phone: string | null
        role_name: string
      }
    | {
        id: string
        full_name: string
        phone: string | null
        role_name: string
      }[]
    | null

  attendances:
    | AttendanceItem
    | AttendanceItem[]
    | null
}

export default function PresencasClient({
  email,
  fullName,
  role,
}: PresencasProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)

  const [events, setEvents] = useState<EventItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])

  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [search, setSearch] = useState('')

  const owner = role === 'owner'

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)

    window.document.documentElement.dataset.theme = isDark
      ? 'dark'
      : 'light'

    void loadData()
  }, [])

  function toggleTheme() {
    const next = !dark

    setDark(next)

    window.document.documentElement.dataset.theme = next
      ? 'dark'
      : 'light'

    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  async function logout() {
    const supabase = createClient()

    await supabase.auth.signOut()

    router.replace('/login')
    router.refresh()
  }

  async function loadData() {
    setLoading(true)

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let hiddenBefore: string | null = null

    if (user) {
      const { data: preference, error: preferenceError } =
        await supabase
          .from('module_view_preferences')
          .select('hidden_before')
          .eq('user_id', user.id)
          .eq('entity_type', 'attendances')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de attendances:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let schedulesQuery = supabase
      .from('schedules')
      .select(`
        id,
        event_id,
        worker_id,
        work_date,
        role_name,
        start_time,
        end_time,
        status,

        events (
          id,
          name
        ),

        workers (
          id,
          full_name,
          phone,
          role_name
        ),

        attendances (
          id,
          attendance_status,
          check_in,
          check_out,
          notes
        )
      `)
      .order('work_date', { ascending: false })

    if (hiddenBefore) {
      schedulesQuery = schedulesQuery.gt('created_at', hiddenBefore)
    }

    const [eventsResponse, schedulesResponse] = await Promise.all([
      supabase
        .from('events')
        .select('id, name')
        .order('name'),

      schedulesQuery,
    ])

    if (!eventsResponse.error) {
      setEvents(eventsResponse.data ?? [])
    }

    if (schedulesResponse.error) {
      console.error(
        'Erro ao carregar presenças:',
        schedulesResponse.error.message
      )
      setSchedules([])
    } else {
      setSchedules(
        (schedulesResponse.data ?? []) as ScheduleItem[]
      )
    }

    setLoading(false)
  }

  function getEvent(item: ScheduleItem) {
    if (!item.events) return null

    if (Array.isArray(item.events)) {
      return item.events[0] ?? null
    }

    return item.events
  }

  function getWorker(item: ScheduleItem) {
    if (!item.workers) return null

    if (Array.isArray(item.workers)) {
      return item.workers[0] ?? null
    }

    return item.workers
  }

  function getAttendance(item: ScheduleItem) {
    if (!item.attendances) return null

    if (Array.isArray(item.attendances)) {
      return item.attendances[0] ?? null
    }

    return item.attendances
  }

  function formatDate(date: string) {
    if (!date) return '-'

    const [year, month, day] = date.split('-')

    return `${day}/${month}/${year}`
  }

  function statusText(
    status: 'pending' | 'present' | 'absent'
  ) {
    switch (status) {
      case 'present':
        return 'Presente'

      case 'absent':
        return 'Faltou'

      default:
        return 'Pendente'
    }
  }

  const availableDates = useMemo(() => {
    const dates = schedules
      .filter((item) => {
        if (!selectedEvent) return true

        return item.event_id === selectedEvent
      })
      .map((item) => item.work_date)

    return [...new Set(dates)].sort().reverse()
  }, [schedules, selectedEvent])

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase()

    return schedules.filter((item) => {
      const event = getEvent(item)
      const worker = getWorker(item)

      const eventMatch =
        !selectedEvent ||
        item.event_id === selectedEvent

      const dateMatch =
        !selectedDate ||
        item.work_date === selectedDate

      const searchMatch =
        !query ||
        (worker?.full_name ?? '')
          .toLowerCase()
          .includes(query) ||
        (worker?.phone ?? '')
          .toLowerCase()
          .includes(query) ||
        (item.role_name ?? '')
          .toLowerCase()
          .includes(query) ||
        (event?.name ?? '')
          .toLowerCase()
          .includes(query)

      return eventMatch && dateMatch && searchMatch
    })
  }, [
    schedules,
    selectedEvent,
    selectedDate,
    search,
  ])

  const summary = useMemo(() => {
    let present = 0
    let absent = 0
    let pending = 0

    filteredSchedules.forEach((item) => {
      const attendance = getAttendance(item)

      const status =
        attendance?.attendance_status ?? 'pending'

      if (status === 'present') {
        present++
      } else if (status === 'absent') {
        absent++
      } else {
        pending++
      }
    })

    return {
      total: filteredSchedules.length,
      present,
      absent,
      pending,
    }
  }, [filteredSchedules])

  async function updateAttendance(
    scheduleId: string,
    attendanceStatus:
      | 'pending'
      | 'present'
      | 'absent',
    checkIn?: string | null,
    checkOut?: string | null
  ) {
    setSavingId(scheduleId)

    const supabase = createClient()

    const current = schedules.find(
      (item) => item.id === scheduleId
    )

    const attendance = current
      ? getAttendance(current)
      : null

    const { error } = await supabase
      .from('attendances')
      .upsert(
        {
          schedule_id: scheduleId,

          attendance_status: attendanceStatus,

          check_in:
            checkIn !== undefined
              ? checkIn || null
              : attendance?.check_in ?? null,

          check_out:
            checkOut !== undefined
              ? checkOut || null
              : attendance?.check_out ?? null,
        },
        {
          onConflict: 'schedule_id',
        }
      )

    setSavingId(null)

    if (error) {
      alert(
        `Erro ao atualizar presença: ${error.message}`
      )

      return
    }

    await loadData()
  }

  return (
    <div className="dashboard-shell">

      <AppSidebar
        fullName={fullName}
        role={role}
      />

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <span className="eyebrow">
              OPERAÇÃO
            </span>

            <h1>
              Presenças
            </h1>

            <p>
              Faça o check-in e controle faltas por evento.
            </p>

          </div>

          <div className="dashboard-actions">

            <button
              className="icon-btn"
              aria-label="Notificações"
            >
              <Bell />
            </button>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alterar tema"
            >
              {dark ? <Sun /> : <Moon />}
            </button>

            <button
              className="logout-btn"
              onClick={logout}
            >
              <LogOut />
              Sair
            </button>

          </div>

        </header>

        <section className="attendance-summary">

          <article>
            <span>
              ESCALADOS
            </span>

            <strong>
              {summary.total}
            </strong>
          </article>

          <article>
            <span>
              PRESENTES
            </span>

            <strong className="attendance-green">
              {summary.present}
            </strong>
          </article>

          <article>
            <span>
              FALTAS
            </span>

            <strong className="attendance-red">
              {summary.absent}
            </strong>
          </article>

          <article>
            <span>
              PENDENTES
            </span>

            <strong className="attendance-orange">
              {summary.pending}
            </strong>
          </article>

        </section>

        <section className="attendance-filters">

          <div className="attendance-select">

            <label>
              Evento
            </label>

            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value)
                setSelectedDate('')
              }}
            >
              <option value="">
                Todos os eventos
              </option>

              {events.map((event) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.name}
                </option>
              ))}

            </select>

          </div>

          <div className="attendance-select">

            <label>
              Data
            </label>

            <select
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
            >
              <option value="">
                Todas as datas
              </option>

              {availableDates.map((date) => (
                <option
                  key={date}
                  value={date}
                >
                  {formatDate(date)}
                </option>
              ))}

            </select>

          </div>

          <div className="events-search attendance-search">

            <Search />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar trabalhador..."
            />

          </div>

        </section>

        <section className="events-list-card">

          {loading ? (
            <div className="events-empty">
              Carregando presenças...
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="events-empty">

              <UserRoundCheck />

              <strong>
                Nenhuma escala encontrada
              </strong>

              <span>
                Crie uma escala antes de registrar a presença.
              </span>

            </div>
          ) : (
            <div className="events-table-scroll">

              <table className="management-table attendance-table">

                <thead>

                  <tr>
                    <th>Trabalhador</th>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Função</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredSchedules.map((item) => {
                    const worker = getWorker(item)
                    const event = getEvent(item)
                    const attendance = getAttendance(item)

                    const attendanceStatus =
                      attendance?.attendance_status ??
                      'pending'

                    const saving =
                      savingId === item.id

                    return (
                      <tr key={item.id}>

                        <td>
                          <div className="event-name-cell">

                            <div className="table-icon">
                              <User />
                            </div>

                            <div>
                              <strong>
                                {worker?.full_name ?? '-'}
                              </strong>

                              <span>
                                {worker?.phone ??
                                  'Telefone não informado'}
                              </span>
                            </div>

                          </div>
                        </td>

                        <td>
                          <div className="table-location">
                            <Calendar />
                            {event?.name ?? '-'}
                          </div>
                        </td>

                        <td>
                          {formatDate(item.work_date)}
                        </td>

                        <td>
                          {item.role_name ||
                            worker?.role_name ||
                            '-'}
                        </td>

                        <td>
                          <input
                            className="attendance-time"
                            type="time"
                            value={
                              attendance?.check_in?.slice(
                                0,
                                5
                              ) ?? ''
                            }
                            onChange={(e) =>
                              updateAttendance(
                                item.id,
                                attendanceStatus,
                                e.target.value,
                                undefined
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="attendance-time"
                            type="time"
                            value={
                              attendance?.check_out?.slice(
                                0,
                                5
                              ) ?? ''
                            }
                            onChange={(e) =>
                              updateAttendance(
                                item.id,
                                attendanceStatus,
                                undefined,
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <span
                            className={`attendance-status attendance-${attendanceStatus}`}
                          >

                            {attendanceStatus ===
                              'present' && (
                              <CheckCircle2 />
                            )}

                            {attendanceStatus ===
                              'absent' && (
                              <XCircle />
                            )}

                            {attendanceStatus ===
                              'pending' && (
                              <CircleHelp />
                            )}

                            {statusText(
                              attendanceStatus
                            )}

                          </span>
                        </td>

                        <td>
                          <div className="attendance-actions">

                            <button
                              type="button"
                              className="attendance-present-btn"
                              disabled={saving}
                              onClick={() =>
                                updateAttendance(
                                  item.id,
                                  'present'
                                )
                              }
                              title="Marcar presença"
                            >
                              <CheckCircle2 />
                            </button>

                            <button
                              type="button"
                              className="attendance-absent-btn"
                              disabled={saving}
                              onClick={() =>
                                updateAttendance(
                                  item.id,
                                  'absent'
                                )
                              }
                              title="Marcar falta"
                            >
                              <XCircle />
                            </button>

                            <button
                              type="button"
                              className="attendance-pending-btn"
                              disabled={saving}
                              onClick={() =>
                                updateAttendance(
                                  item.id,
                                  'pending'
                                )
                              }
                              title="Voltar para pendente"
                            >
                              <Clock3 />
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  })}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

    </div>
  )
}