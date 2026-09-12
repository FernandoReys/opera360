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
  Plus,
  X,
  Calendar,
  Printer,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type EscalasProps = {
  email: string
  fullName: string
  role: string
}

type EventItem = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

type WorkerItem = {
  id: string
  full_name: string
  role_name: string
  phone: string | null
  active: boolean
}

type ScheduleItem = {
  id: string
  event_id: string
  work_date: string
  role_name: string | null
  start_time: string | null
  end_time: string | null
  status: string
  events:
    | {
        name: string
      }
    | {
        name: string
      }[]
    | null
  workers:
    | {
        full_name: string
      }
    | {
        full_name: string
      }[]
    | null
}

export default function EscalasClient({
  email,
  fullName,
  role,
}: EscalasProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)

  const [events, setEvents] = useState<EventItem[]>([])
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const [eventId, setEventId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])

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

    if (!requestedEventId) return

    setEventId(requestedEventId)
    setModalOpen(true)
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
          .eq('entity_type', 'schedules')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de schedules:',
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
        work_date,
        role_name,
        start_time,
        end_time,
        status,
        events (
          name
        ),
        workers (
          full_name
        )
      `)
      .order('work_date', { ascending: false })

    if (hiddenBefore) {
      schedulesQuery = schedulesQuery.gt('created_at', hiddenBefore)
    }

    const [eventsResponse, workersResponse, schedulesResponse] =
      await Promise.all([
        supabase
          .from('events')
          .select('id, name, start_date, end_date, status')
          .order('start_date', { ascending: false }),

        supabase
          .from('workers')
          .select('id, full_name, role_name, phone, active')
          .eq('active', true)
          .order('full_name'),

        schedulesQuery,
      ])

    if (!eventsResponse.error) {
      setEvents(eventsResponse.data ?? [])
    }

    if (!workersResponse.error) {
      setWorkers(workersResponse.data ?? [])
    }

    if (schedulesResponse.error) {
      console.error(
        'Erro ao carregar escalas:',
        schedulesResponse.error.message
      )
      setSchedules([])
    } else {
      setSchedules((schedulesResponse.data ?? []) as ScheduleItem[])
    }

    setLoading(false)
  }

  function getEventName(item: ScheduleItem) {
    if (!item.events) return '-'

    if (Array.isArray(item.events)) {
      return item.events[0]?.name ?? '-'
    }

    return item.events.name
  }

  function getWorkerName(item: ScheduleItem) {
    if (!item.workers) return '-'

    if (Array.isArray(item.workers)) {
      return item.workers[0]?.full_name ?? '-'
    }

    return item.workers.full_name
  }

  function formatDate(date: string) {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return schedules
    }

    return schedules.filter((item) => {
      return (
        getEventName(item).toLowerCase().includes(query) ||
        getWorkerName(item).toLowerCase().includes(query) ||
        (item.role_name ?? '').toLowerCase().includes(query)
      )
    })
  }, [schedules, search])

  const scheduleableEvents = useMemo(() => {
    const seen = new Set<string>()

    return [...events]
      .filter((event) =>
        event.status === 'scheduled' || event.status === 'in_progress'
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .filter((event) => {
        const key = [
          event.name.trim().toLowerCase(),
          event.start_date,
          event.end_date,
        ].join('|')

        if (seen.has(key)) return false

        seen.add(key)
        return true
      })
  }, [events])

  const scheduleGroups = useMemo(() => {
    const groups = new Map<
      string,
      { eventName: string; items: ScheduleItem[] }
    >()

    filteredSchedules.forEach((item) => {
      const current = groups.get(item.event_id) ?? {
        eventName: getEventName(item),
        items: [],
      }

      current.items.push(item)
      groups.set(item.event_id, current)
    })

    return [...groups.entries()].map(([eventId, group]) => ({
      eventId,
      ...group,
    }))
  }, [filteredSchedules])

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function datesBetween(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)
    const dates: string[] = []

    while (start.getTime() <= end.getTime()) {
      dates.push(
        `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      )
      start.setDate(start.getDate() + 1)
    }

    return dates
  }

  function printSchedules() {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const groupsHtml = scheduleGroups
      .map(
        (group) => `
          <section>
            <h2>${escapeHtml(group.eventName)} <small>${group.items.length} trabalhador(es)</small></h2>
            <table><thead><tr><th>Trabalhador</th><th>Data</th><th>Função</th><th>Horário</th><th>Status</th></tr></thead>
            <tbody>${group.items.map((item) => `<tr><td>${escapeHtml(getWorkerName(item))}</td><td>${formatDate(item.work_date)}</td><td>${escapeHtml(item.role_name || '-')}</td><td>${item.start_time ? item.start_time.slice(0, 5) : '--:--'} - ${item.end_time ? item.end_time.slice(0, 5) : '--:--'}</td><td>Escalado</td></tr>`).join('')}</tbody></table>
          </section>`
      )
      .join('')

    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Escalas - Opera360</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:36px}header{border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:28px}h1{margin:0;font-size:26px}.tag{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:1px}h2{font-size:17px;margin:26px 0 10px}h2 small{font-size:12px;color:#667085;font-weight:400}table{width:100%;border-collapse:collapse}th{text-align:left;background:#eff6ff;color:#1e3a5f}th,td{padding:10px;border-bottom:1px solid #e5e7eb;font-size:12px}.footer{margin-top:34px;color:#667085;font-size:11px}@media print{body{margin:20px}}</style></head><body><header><div class="tag">OPERA360 - GESTÃO OPERACIONAL</div><h1>Escalas por evento</h1></header>${groupsHtml || '<p>Nenhuma escala encontrada.</p>'}<p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}.</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  function toggleWorker(workerId: string) {
    setSelectedWorkers((current) => {
      if (current.includes(workerId)) {
        return current.filter((id) => id !== workerId)
      }

      return [...current, workerId]
    })
  }

  function resetForm() {
    setEventId('')
    setStartTime('')
    setEndTime('')
    setSelectedWorkers([])
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  async function createSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!eventId) {
      alert('Selecione um evento.')
      return
    }

    if (selectedWorkers.length === 0) {
      alert('Selecione pelo menos um trabalhador.')
      return
    }

    if (!startTime || !endTime) {
      alert('Informe o horário inicial e o horário final da escala.')
      return
    }

    if (endTime <= startTime) {
      alert('O horário final precisa ser maior que o horário inicial.')
      return
    }

    const selected = workers.filter((worker) =>
      selectedWorkers.includes(worker.id)
    )

    const selectedEvent = events.find((event) => event.id === eventId)

    if (!selectedEvent) {
      alert('Evento não encontrado.')
      return
    }

    setSaving(true)

    const scheduleDates = datesBetween(
      selectedEvent.start_date,
      selectedEvent.end_date
    )

    const rows = selected.flatMap((worker) =>
      scheduleDates.map((date) => ({
        event_id: eventId,
        worker_id: worker.id,
        work_date: date,
        role_name: worker.role_name,
        // Os mesmos horários são gravados em todos os dias do evento.
        start_time: startTime,
        end_time: endTime,
        status: 'scheduled',
      }))
    )

    const supabase = createClient()

    const { data: createdSchedules, error } = await supabase
      .from('schedules')
      .insert(rows)
      .select('id')

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        alert(
          'Um ou mais trabalhadores já estão escalados nesse evento nesta data.'
        )
        return
      }

      alert(`Erro ao criar escala: ${error.message}`)
      return
    }

    const { error: attendanceError } = await supabase
      .from('attendances')
      .upsert(
        (createdSchedules ?? []).map((schedule) => ({
          schedule_id: schedule.id,
          attendance_status: 'pending',
        })),
        { onConflict: 'schedule_id' }
      )

    if (attendanceError) {
      alert(
        `A escala foi criada, mas houve erro ao preparar as presenças: ${attendanceError.message}`
      )
    }

    closeModal()
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
            <span className="eyebrow">OPERAÇÃO</span>
            <h1>Escalas</h1>
            <p>
              Organize os trabalhadores por evento e por dia.
            </p>
          </div>

          <div className="dashboard-actions">
            <button className="icon-btn" aria-label="Notificações">
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

        <section className="schedule-summary">
          <article>
            <span>ESCALAS CADASTRADAS</span>
            <strong>{schedules.length}</strong>
          </article>

          <article>
            <span>TRABALHADORES ATIVOS</span>
            <strong className="event-green">
              {workers.length}
            </strong>
          </article>

          <article>
            <span>EVENTOS DISPONÍVEIS</span>
            <strong className="event-blue">
              {scheduleableEvents.length}
            </strong>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />

            <input
              type="text"
              placeholder="Buscar evento, trabalhador ou função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="events-toolbar-actions">
            <button type="button" className="event-cancel-btn" onClick={printSchedules}>
              <Printer />
              Gerar PDF
            </button>
            <button className="new-event-btn" onClick={() => setModalOpen(true)}>
              <Plus />
              Nova escala
            </button>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">
              Carregando escalas...
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="events-empty">
              <ClipboardCheck />

              <strong>Nenhuma escala encontrada</strong>

              <span>
                Crie a primeira escala para organizar a equipe.
              </span>
            </div>
          ) : (
            <div className="operation-event-groups">
              {scheduleGroups.map((group) => (
                <article className="operation-event-group" key={group.eventId}>
                  <header className="operation-event-group-header">
                    <div className="table-icon"><Calendar /></div>
                    <div>
                      <span>EVENTO</span>
                      <h3>{group.eventName}</h3>
                    </div>
                    <strong>{group.items.length} trabalhador(es)</strong>
                  </header>

                  <div className="operation-team-list">
                    {group.items.map((item) => (
                      <div className="operation-team-row" key={item.id}>
                        <div><span>Trabalhador</span><strong>{getWorkerName(item)}</strong></div>
                        <div><span>Data</span><strong>{formatDate(item.work_date)}</strong></div>
                        <div><span>Função</span><strong>{item.role_name || '-'}</strong></div>
                        <div><span>Horário</span><strong>{item.start_time ? item.start_time.slice(0, 5) : '--:--'} - {item.end_time ? item.end_time.slice(0, 5) : '--:--'}</strong></div>
                        <span className="event-status status-scheduled">Escalado</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div
          className="event-modal-overlay"
          onMouseDown={closeModal}
        >
          <div
            className="event-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="event-modal-header">
              <div>
                <span className="eyebrow">
                  NOVA ESCALA
                </span>

                <h2>Montar escala</h2>

                <p>
                  Escolha o evento e a equipe. As escalas serão criadas em todos os dias do período.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>

            <form
              className="event-form"
              onSubmit={createSchedule}
            >
              <div className="event-form-grid">
                <label className="event-field event-field-wide">
                  <span>Evento *</span>

                  <select
                    value={eventId}
                    onChange={(e) =>
                      setEventId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Selecione um evento
                    </option>

                    {scheduleableEvents.map((event) => (
                      <option
                        key={event.id}
                        value={event.id}
                      >
                        {event.name} - {formatDate(event.start_date)} a{' '}
                        {formatDate(event.end_date)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="event-field event-field-wide schedule-period-info">
                  <span>Escala automática por período</span>
                  {eventId ? (
                    <small>
                      Serão criadas escalas e presenças pendentes para todos os dias do evento selecionado.
                    </small>
                  ) : (
                    <small>Selecione um evento para calcular os dias automaticamente.</small>
                  )}
                </div>

                <label className="event-field">
                  <span>Horário inicial</span>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) =>
                      setStartTime(e.target.value)
                    }
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Horário final</span>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) =>
                      setEndTime(e.target.value)
                    }
                    required
                  />
                </label>

                <div className="event-field event-field-wide">
                  <span>Trabalhadores *</span>

                  <div className="worker-picker">
                    {workers.length === 0 ? (
                      <div className="worker-picker-empty">
                        Nenhum trabalhador ativo cadastrado.
                      </div>
                    ) : (
                      workers.map((worker) => {
                        const selected =
                          selectedWorkers.includes(worker.id)

                        return (
                          <button
                            type="button"
                            key={worker.id}
                            className={
                              selected
                                ? 'worker-option selected'
                                : 'worker-option'
                            }
                            onClick={() =>
                              toggleWorker(worker.id)
                            }
                          >
                            <div className="worker-option-avatar">
                              {worker.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {worker.full_name}
                              </strong>

                              <span>
                                {worker.role_name}
                              </span>
                            </div>

                            <div className="worker-check">
                              {selected ? '✓' : ''}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  <small className="schedule-selected-count">
                    {selectedWorkers.length} trabalhador(es) selecionado(s)
                  </small>
                </div>
              </div>

              <div className="event-form-actions">
                <button
                  type="button"
                  className="event-cancel-btn"
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="new-event-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Salvando...'
                    : 'Criar escalas do evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
