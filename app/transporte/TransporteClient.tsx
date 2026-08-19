'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type TransporteProps = {
  email: string
  fullName: string
  role: string
}

type EventItem = {
  id: string
  name: string
}

type ScheduleItem = {
  id: string
  event_id: string
  work_date: string
}

type TransportItem = {
  id: string
  event_id: string
  transport_date: string
  workers_quantity: number
  value_per_worker: number
  extra_costs: number
  total_value: number
  provider: string | null
  vehicle: string | null
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
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
}

export default function TransporteClient({
  email,
  fullName,
  role,
}: TransporteProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [events, setEvents] = useState<EventItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [transports, setTransports] = useState<TransportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)

  const [eventId, setEventId] = useState('')
  const [transportDate, setTransportDate] = useState('')
  const [workersQuantity, setWorkersQuantity] = useState('')
  const [valuePerWorker, setValuePerWorker] = useState('0')
  const [extraCosts, setExtraCosts] = useState('0')
  const [provider, setProvider] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [status, setStatus] = useState<
    'planned' | 'confirmed' | 'completed' | 'cancelled'
  >('planned')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    setTransportDate(new Date().toISOString().slice(0, 10))

    void loadData()
  }, [])

  function toggleTheme() {
    const next = !dark

    setDark(next)
    window.document.documentElement.dataset.theme = next ? 'dark' : 'light'
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
          .eq('entity_type', 'transports')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de transports:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let transportsQuery = supabase
      .from('transports')
      .select(`
        id,
        event_id,
        transport_date,
        workers_quantity,
        value_per_worker,
        extra_costs,
        total_value,
        provider,
        vehicle,
        status,
        notes,
        created_at,
        events (
          id,
          name
        )
      `)
      .order('transport_date', { ascending: false })

    if (hiddenBefore) {
      transportsQuery = transportsQuery.gt('created_at', hiddenBefore)
    }

    const [eventsResponse, schedulesResponse, transportsResponse] =
      await Promise.all([
        supabase
          .from('events')
          .select('id, name')
          .order('name'),

        supabase
          .from('schedules')
          .select('id, event_id, work_date'),

        transportsQuery,
      ])

    if (!eventsResponse.error) {
      setEvents(eventsResponse.data ?? [])
    }

    if (!schedulesResponse.error) {
      setSchedules((schedulesResponse.data ?? []) as ScheduleItem[])
    }

    if (transportsResponse.error) {
      console.error(
        'Erro ao carregar transportes:',
        transportsResponse.error.message
      )
      setTransports([])
    } else {
      setTransports((transportsResponse.data ?? []) as TransportItem[])
    }

    setLoading(false)
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0))
  }

  function formatDate(value: string) {
    if (!value) return '-'
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  function eventName(item: TransportItem) {
    if (!item.events) return '-'
    if (Array.isArray(item.events)) return item.events[0]?.name ?? '-'
    return item.events.name
  }

  function countScheduledWorkers(selectedEventId: string, selectedDate: string) {
    if (!selectedEventId || !selectedDate) return 0

    return schedules.filter(
      (item) =>
        item.event_id === selectedEventId &&
        item.work_date === selectedDate
    ).length
  }

  const suggestedWorkers = useMemo(
    () => countScheduledWorkers(eventId, transportDate),
    [eventId, transportDate, schedules]
  )

  useEffect(() => {
    if (suggestedWorkers > 0 && !workersQuantity) {
      setWorkersQuantity(String(suggestedWorkers))
    }
  }, [suggestedWorkers, workersQuantity])

  const totalPreview = useMemo(() => {
    return (
      Number(workersQuantity || 0) * Number(valuePerWorker || 0) +
      Number(extraCosts || 0)
    )
  }, [workersQuantity, valuePerWorker, extraCosts])

  const filteredTransports = useMemo(() => {
    const query = search.trim().toLowerCase()

    return transports.filter((item) => {
      const matchesSearch =
        !query ||
        eventName(item).toLowerCase().includes(query) ||
        (item.provider ?? '').toLowerCase().includes(query) ||
        (item.vehicle ?? '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [transports, search, statusFilter])

  const summary = useMemo(() => {
    const active = transports.filter(
      (item) =>
        item.status === 'planned' ||
        item.status === 'confirmed'
    )

    const completed = transports.filter(
      (item) => item.status === 'completed'
    )

    return {
      total: transports.length,
      active: active.length,
      completed: completed.length,
      totalValue: transports
        .filter((item) => item.status !== 'cancelled')
        .reduce(
          (sum, item) => sum + Number(item.total_value || 0),
          0
        ),
    }
  }, [transports])

  function resetForm() {
    setEventId('')
    setTransportDate(new Date().toISOString().slice(0, 10))
    setWorkersQuantity('')
    setValuePerWorker('0')
    setExtraCosts('0')
    setProvider('')
    setVehicle('')
    setStatus('planned')
    setNotes('')
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    resetForm()
  }

  async function createTransport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!eventId) {
      alert('Selecione o evento.')
      return
    }

    if (!transportDate) {
      alert('Informe a data.')
      return
    }

    const workers = Number(workersQuantity || 0)
    const unitValue = Number(valuePerWorker || 0)
    const extras = Number(extraCosts || 0)

    if (workers <= 0) {
      alert('Informe a quantidade de trabalhadores.')
      return
    }

    if (unitValue < 0 || extras < 0) {
      alert('Os valores nÃ£o podem ser negativos.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('transports')
      .upsert(
        {
          event_id: eventId,
          transport_date: transportDate,
          workers_quantity: workers,
          value_per_worker: unitValue,
          extra_costs: extras,
          total_value: workers * unitValue + extras,
          provider: provider.trim() || null,
          vehicle: vehicle.trim() || null,
          status,
          notes: notes.trim() || null,
        },
        {
          onConflict: 'event_id,transport_date',
        }
      )

    setSaving(false)

    if (error) {
      alert(`Erro ao salvar transporte: ${error.message}`)
      return
    }

    closeModal()
    await loadData()
  }

  async function changeStatus(
    item: TransportItem,
    nextStatus: TransportItem['status']
  ) {
    setSavingId(item.id)

    const supabase = createClient()

    const { error } = await supabase
      .from('transports')
      .update({
        status: nextStatus,
      })
      .eq('id', item.id)

    setSavingId(null)

    if (error) {
      alert(`Erro ao atualizar status: ${error.message}`)
      return
    }

    await loadData()
  }

  function statusLabel(value: TransportItem['status']) {
    switch (value) {
      case 'planned':
        return 'Planejado'
      case 'confirmed':
        return 'Confirmado'
      case 'completed':
        return 'ConcluÃ­do'
      case 'cancelled':
        return 'Cancelado'
    }
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={fullName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">OPERAÃ‡ÃƒO</span>
            <h1>Transporte</h1>
            <p>
              Controle transporte, quantidade de trabalhadores e custos por evento.
            </p>
          </div>

          <div className="dashboard-actions">
            <button className="icon-btn" aria-label="NotificaÃ§Ãµes">
              <Bell />
            </button>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alterar tema"
            >
              {dark ? <Sun /> : <Moon />}
            </button>

            <button className="logout-btn" onClick={logout}>
              <LogOut />
              Sair
            </button>
          </div>
        </header>

        <section className="transport-summary">
          <article>
            <span>REGISTROS</span>
            <strong>{summary.total}</strong>
          </article>

          <article>
            <span>EM ABERTO</span>
            <strong className="attendance-orange">
              {summary.active}
            </strong>
          </article>

          <article>
            <span>CONCLUÃDOS</span>
            <strong className="attendance-green">
              {summary.completed}
            </strong>
          </article>

          <article>
            <span>CUSTO TOTAL</span>
            <strong className="transport-cost">
              {formatMoney(summary.totalValue)}
            </strong>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento, fornecedor ou veÃ­culo..."
            />
          </div>

          <div className="events-toolbar-actions">
            <div className="event-filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="planned">Planejados</option>
                <option value="confirmed">Confirmados</option>
                <option value="completed">ConcluÃ­dos</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            <button
              className="new-event-btn"
              onClick={() => setModalOpen(true)}
            >
              <Plus />
              Novo transporte
            </button>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">
              Carregando transportes...
            </div>
          ) : filteredTransports.length === 0 ? (
            <div className="events-empty">
              <Bus />
              <strong>Nenhum transporte encontrado</strong>
              <span>
                Cadastre o transporte do primeiro evento.
              </span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table transport-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Trabalhadores</th>
                    <th>Valor por trabalhador</th>
                    <th>Extras</th>
                    <th>Total</th>
                    <th>Fornecedor</th>
                    <th>VeÃ­culo</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransports.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{eventName(item)}</strong>
                      </td>

                      <td>
                        <div className="table-location">
                          <CalendarDays />
                          {formatDate(item.transport_date)}
                        </div>
                      </td>

                      <td>{item.workers_quantity}</td>

                      <td>
                        {formatMoney(item.value_per_worker)}
                      </td>

                      <td>
                        {formatMoney(item.extra_costs)}
                      </td>

                      <td>
                        <strong className="transport-cost">
                          {formatMoney(item.total_value)}
                        </strong>
                      </td>

                      <td>{item.provider || '-'}</td>

                      <td>{item.vehicle || '-'}</td>

                      <td>
                        <select
                          className={`transport-status transport-status-${item.status}`}
                          value={item.status}
                          disabled={savingId === item.id}
                          onChange={(e) =>
                            changeStatus(
                              item,
                              e.target.value as TransportItem['status']
                            )
                          }
                        >
                          <option value="planned">
                            {statusLabel('planned')}
                          </option>
                          <option value="confirmed">
                            {statusLabel('confirmed')}
                          </option>
                          <option value="completed">
                            {statusLabel('completed')}
                          </option>
                          <option value="cancelled">
                            {statusLabel('cancelled')}
                          </option>
                        </select>
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
                <span className="eyebrow">TRANSPORTE</span>
                <h2>Novo transporte</h2>
                <p>
                  Informe o evento, a data e os custos do transporte.
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
              onSubmit={createTransport}
            >
              <div className="event-form-grid">
                <label className="event-field">
                  <span>Evento *</span>
                  <select
                    value={eventId}
                    onChange={(e) => {
                      setEventId(e.target.value)
                      setWorkersQuantity('')
                    }}
                    required
                  >
                    <option value="">Selecione</option>

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
                  <span>Data *</span>
                  <input
                    type="date"
                    value={transportDate}
                    onChange={(e) => {
                      setTransportDate(e.target.value)
                      setWorkersQuantity('')
                    }}
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Trabalhadores *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={workersQuantity}
                    onChange={(e) =>
                      setWorkersQuantity(e.target.value)
                    }
                    required
                  />

                  {suggestedWorkers > 0 && (
                    <small className="transport-suggestion">
                      Escalados nessa data: {suggestedWorkers}
                    </small>
                  )}
                </label>

                <label className="event-field">
                  <span>Valor por trabalhador</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valuePerWorker}
                    onChange={(e) =>
                      setValuePerWorker(e.target.value)
                    }
                  />
                </label>

                <label className="event-field">
                  <span>Custos extras</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraCosts}
                    onChange={(e) =>
                      setExtraCosts(e.target.value)
                    }
                  />
                </label>

                <label className="event-field">
                  <span>Fornecedor / motorista</span>
                  <input
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                </label>

                <label className="event-field">
                  <span>VeÃ­culo</span>
                  <input
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="Van, Ã´nibus, carro..."
                  />
                </label>

                <label className="event-field">
                  <span>Status</span>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as
                          | 'planned'
                          | 'confirmed'
                          | 'completed'
                          | 'cancelled'
                      )
                    }
                  >
                    <option value="planned">Planejado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">ConcluÃ­do</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </label>

                <label className="event-field event-field-wide">
                  <span>ObservaÃ§Ãµes</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: saÃ­da Ã s 06h, ponto de encontro..."
                  />
                </label>
              </div>

              <div className="transport-preview">
                <div>
                  <span>Total previsto</span>
                  <small>
                    {Number(workersQuantity || 0)} trabalhador(es)
                  </small>
                </div>

                <strong>
                  {formatMoney(totalPreview)}
                </strong>
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
                  <CheckCircle2 />
                  {saving ? 'Salvando...' : 'Salvar transporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}