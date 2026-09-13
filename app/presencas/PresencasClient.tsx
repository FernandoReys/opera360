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
  Printer,
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
  start_date: string
  end_date: string
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

  useEffect(() => {
    const requestedEventId = new URLSearchParams(
      window.location.search
    ).get('eventId')

    if (requestedEventId) {
      setSelectedEvent(requestedEventId)
    }
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
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false }),

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

  const attendanceGroups = useMemo(() => {
    const groups = new Map<
      string,
      { eventName: string; workDate: string; items: ScheduleItem[] }
    >()

    filteredSchedules.forEach((item) => {
      const event = getEvent(item)
      const groupKey = `${item.event_id}-${item.work_date}`
      const current = groups.get(groupKey) ?? {
        eventName: event?.name ?? 'Evento não identificado',
        workDate: item.work_date,
        items: [],
      }

      current.items.push(item)
      groups.set(groupKey, current)
    })

    return [...groups.entries()]
      .map(([groupKey, group]) => ({ groupKey, ...group }))
      .sort((a, b) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const dateA = new Date(`${a.workDate}T12:00:00`)
        const dateB = new Date(`${b.workDate}T12:00:00`)
        const offsetA = dateA.getTime() - today.getTime()
        const offsetB = dateB.getTime() - today.getTime()

        if (offsetA >= 0 && offsetB >= 0) return offsetA - offsetB
        if (offsetA >= 0) return -1
        if (offsetB >= 0) return 1
        return offsetB - offsetA
      })
  }, [filteredSchedules])

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function printAttendances() {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const groupsHtml = attendanceGroups
      .map(
        (group) => `
          <section>
            <h2>${escapeHtml(group.eventName)} — ${formatDate(group.workDate)} <small>${group.items.length} trabalhador(es)</small></h2>
            <table><thead><tr><th>Nome</th><th>Data</th><th>Função</th><th>Entrada</th><th>Saída</th><th>Status</th></tr></thead>
            <tbody>${group.items.map((item) => { const worker = getWorker(item); const attendance = getAttendance(item); const status = attendance?.attendance_status ?? 'pending'; return `<tr><td>${escapeHtml(worker?.full_name ?? '-')}</td><td>${formatDate(item.work_date)}</td><td>${escapeHtml(item.role_name || worker?.role_name || '-')}</td><td>${attendance?.check_in?.slice(0, 5) ?? '--:--'}</td><td>${attendance?.check_out?.slice(0, 5) ?? '--:--'}</td><td>${statusText(status)}</td></tr>` }).join('')}</tbody></table>
          </section>`
      )
      .join('')

    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Presenças - Opera360</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:36px}header{border-bottom:3px solid #16a34a;padding-bottom:16px;margin-bottom:28px}h1{margin:0;font-size:26px}.tag{color:#16a34a;font-size:12px;font-weight:700;letter-spacing:1px}h2{font-size:17px;margin:26px 0 10px}h2 small{font-size:12px;color:#667085;font-weight:400}table{width:100%;border-collapse:collapse}th{text-align:left;background:#ecfdf3;color:#14532d}th,td{padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px}.footer{margin-top:34px;color:#667085;font-size:11px}@media print{body{margin:20px}}</style></head><body><header><div class="tag">OPERA360 - GESTÃO OPERACIONAL</div><h1>Relatório de presenças</h1></header>${groupsHtml || '<p>Nenhuma presença encontrada.</p>'}<p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}.</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

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

    const { data: savedAttendance, error } = await supabase
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
      .select(
        'id, attendance_status, check_in, check_out, notes'
      )
      .single()

    setSavingId(null)

    if (error) {
      alert(
        `Erro ao atualizar presença: ${error.message}`
      )

      return
    }

    if (!savedAttendance) return

    setSchedules((currentSchedules) =>
      currentSchedules.map((item) =>
        item.id === scheduleId
          ? {
              ...item,
              attendances: savedAttendance as AttendanceItem,
            }
          : item
      )
    )
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
                  {event.name} - {formatDate(event.start_date)} a{' '}
                  {formatDate(event.end_date)}
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

          <button
            type="button"
            className="event-cancel-btn attendance-pdf-btn"
            onClick={printAttendances}
          >
            <Printer />
            Gerar PDF
          </button>

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
            <div className="operation-event-groups">
              {attendanceGroups.map((group) => (
                <article className="operation-event-group attendance-date-group" key={group.groupKey}>
                  <header className="operation-event-group-header">
                    <div className="table-icon"><Calendar /></div>
                    <div>
                      <span>EVENTO</span>
                      <h3>{group.eventName}</h3>
                      <p className="attendance-group-date">Data: {formatDate(group.workDate)}</p>
                    </div>
                    <strong>{group.items.length} trabalhador(es)</strong>
                  </header>

                  <div className="operation-team-list attendance-team-list">
                    {group.items.map((item) => {
                      const worker = getWorker(item)
                      const attendance = getAttendance(item)
                      const attendanceStatus = attendance?.attendance_status ?? 'pending'
                      const saving = savingId === item.id

                      return (
                        <div className="operation-attendance-row" key={item.id}>
                          <div className="operation-worker-name">
                            <div className="table-icon"><User /></div>
                            <div><strong>{worker?.full_name ?? '-'}</strong></div>
                          </div>
                          <div><span>Data / Função</span><strong>{formatDate(item.work_date)} · {item.role_name || worker?.role_name || '-'}</strong></div>
                          <label><span>Entrada</span><input className="attendance-time" type="time" value={attendance?.check_in?.slice(0, 5) ?? ''} onChange={(e) => updateAttendance(item.id, attendanceStatus, e.target.value, undefined)} /></label>
                          <label><span>Saída</span><input className="attendance-time" type="time" value={attendance?.check_out?.slice(0, 5) ?? ''} onChange={(e) => updateAttendance(item.id, attendanceStatus, undefined, e.target.value)} /></label>
                          <span className={`attendance-status attendance-${attendanceStatus}`}>
                            {attendanceStatus === 'present' && <CheckCircle2 />}
                            {attendanceStatus === 'absent' && <XCircle />}
                            {attendanceStatus === 'pending' && <CircleHelp />}
                            {statusText(attendanceStatus)}
                          </span>
                          <div className="attendance-actions">
                            <button type="button" className="attendance-present-btn" disabled={saving} onClick={() => updateAttendance(item.id, 'present')} title="Marcar presença"><CheckCircle2 /></button>
                            <button type="button" className="attendance-absent-btn" disabled={saving} onClick={() => updateAttendance(item.id, 'absent')} title="Marcar falta"><XCircle /></button>
                            <button type="button" className="attendance-pending-btn" disabled={saving} onClick={() => updateAttendance(item.id, 'pending')} title="Voltar para pendente"><Clock3 /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}

        </section>

      </main>

    </div>
  )
}
