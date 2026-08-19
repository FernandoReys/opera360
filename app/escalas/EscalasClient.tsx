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
  User,
  Clock3,
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
  const [workDate, setWorkDate] = useState('')
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
    setWorkDate('')
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

    if (!workDate) {
      alert('Selecione a data da escala.')
      return
    }

    if (selectedWorkers.length === 0) {
      alert('Selecione pelo menos um trabalhador.')
      return
    }

    setSaving(true)

    const selected = workers.filter((worker) =>
      selectedWorkers.includes(worker.id)
    )

    const rows = selected.map((worker) => ({
      event_id: eventId,
      worker_id: worker.id,
      work_date: workDate,
      role_name: worker.role_name,
      start_time: startTime || null,
      end_time: endTime || null,
      status: 'scheduled',
    }))

    const supabase = createClient()

    const { error } = await supabase
      .from('schedules')
      .insert(rows)

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
              {events.length}
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

          <button
            className="new-event-btn"
            onClick={() => setModalOpen(true)}
          >
            <Plus />
            Nova escala
          </button>
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
            <div className="events-table-scroll">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Trabalhador</th>
                    <th>Função</th>
                    <th>Horário</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSchedules.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="event-name-cell">
                          <div className="table-icon">
                            <Calendar />
                          </div>

                          <div>
                            <strong>
                              {getEventName(item)}
                            </strong>
                          </div>
                        </div>
                      </td>

                      <td>{formatDate(item.work_date)}</td>

                      <td>
                        <div className="table-location">
                          <User />
                          {getWorkerName(item)}
                        </div>
                      </td>

                      <td>
                        {item.role_name || '-'}
                      </td>

                      <td>
                        <div className="table-location">
                          <Clock3 />

                          {item.start_time
                            ? item.start_time.slice(0, 5)
                            : '--:--'}

                          {' - '}

                          {item.end_time
                            ? item.end_time.slice(0, 5)
                            : '--:--'}
                        </div>
                      </td>

                      <td>
                        <span className="event-status status-scheduled">
                          Escalado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  Escolha o evento, a data e os trabalhadores.
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

                    {events.map((event) => (
                      <option
                        key={event.id}
                        value={event.id}
                      >
                        {event.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="event-field">
                  <span>Data da escala *</span>

                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) =>
                      setWorkDate(e.target.value)
                    }
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Horário inicial</span>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) =>
                      setStartTime(e.target.value)
                    }
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
                    : 'Criar escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}