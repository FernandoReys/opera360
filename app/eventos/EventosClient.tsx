'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  ChevronDown,
  MapPin,
  Calendar,
  Users,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type EventosProps = {
  email: string
  fullName: string
  role: string
}

type Client = {
  id: string
  name: string
}

type EventItem = {
  id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  workers_needed: number
  contract_value: number
  meal_value: number
  status:
    | 'draft'
    | 'scheduled'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  notes: string | null
  clients:
    | {
        name: string
      }
    | {
        name: string
      }[]
    | null
}

type Filter =
  | 'all'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export default function EventosClient({
  email,
  fullName,
  role,
}: EventosProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [events, setEvents] = useState<EventItem[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const [modalOpen, setModalOpen] = useState(false)

  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [workersNeeded, setWorkersNeeded] = useState('0')
  const [contractValue, setContractValue] = useState('0')
  const [mealValue, setMealValue] = useState('20')
  const [status, setStatus] = useState<
    'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  >('scheduled')
  const [notes, setNotes] = useState('')

  const owner = role === 'owner'

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

    loadData()
  }, [])

  function toggleTheme() {
    const next = !dark

    setDark(next)

    document.documentElement.dataset.theme = next ? 'dark' : 'light'
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

    const [eventsResponse, clientsResponse] = await Promise.all([
      supabase
        .from('events')
        .select(`
          id,
          name,
          location,
          start_date,
          end_date,
          start_time,
          end_time,
          workers_needed,
          contract_value,
          meal_value,
          status,
          notes,
          clients (
            name
          )
        `)
        .order('start_date', { ascending: false }),

      supabase
        .from('clients')
        .select('id, name')
        .eq('active', true)
        .order('name'),
    ])

    if (!eventsResponse.error) {
      setEvents((eventsResponse.data ?? []) as EventItem[])
    }

    if (!clientsResponse.error) {
      setClients(clientsResponse.data ?? [])
    }

    setLoading(false)
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const clientName = getClientName(event)

      const matchesSearch =
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        clientName.toLowerCase().includes(search.toLowerCase()) ||
        (event.location ?? '').toLowerCase().includes(search.toLowerCase())

      const matchesFilter =
        filter === 'all'
          ? true
          : event.status === filter

      return matchesSearch && matchesFilter
    })
  }, [events, search, filter])

  function getClientName(event: EventItem) {
    if (!event.clients) return 'Sem cliente'

    if (Array.isArray(event.clients)) {
      return event.clients[0]?.name ?? 'Sem cliente'
    }

    return event.clients.name
  }

  function formatDate(date: string) {
    if (!date) return '-'

    const [year, month, day] = date.split('-')

    return `${day}/${month}/${year}`
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0)
  }

  function statusLabel(value: EventItem['status']) {
    switch (value) {
      case 'draft':
        return 'Rascunho'
      case 'scheduled':
        return 'Programado'
      case 'in_progress':
        return 'Em andamento'
      case 'completed':
        return 'Finalizado'
      case 'cancelled':
        return 'Cancelado'
    }
  }

  function resetForm() {
    setName('')
    setClientId('')
    setLocation('')
    setStartDate('')
    setEndDate('')
    setStartTime('')
    setEndTime('')
    setWorkersNeeded('0')
    setContractValue('0')
    setMealValue('20')
    setStatus('scheduled')
    setNotes('')
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !startDate || !endDate) {
      alert('Preencha nome, data inicial e data final.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('events').insert({
      name,
      client_id: clientId || null,
      location: location || null,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      workers_needed: Number(workersNeeded || 0),
      contract_value: Number(contractValue || 0),
      meal_value: Number(mealValue || 20),
      status,
      notes: notes || null,
      created_by: user?.id ?? null,
    })

    setSaving(false)

    if (error) {
      alert(`Erro ao criar evento: ${error.message}`)
      return
    }

    resetForm()
    setModalOpen(false)

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
              Eventos
            </h1>

            <p>
              Gerencie todos os eventos e operações da empresa.
            </p>

          </div>

          <div className="dashboard-actions">

            <button className="icon-btn">
              <Bell />
            </button>

            <button
              className="icon-btn"
              onClick={toggleTheme}
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

        <section className="events-summary">

          <article>
            <span>
              TOTAL DE EVENTOS
            </span>

            <strong>
              {events.length}
            </strong>
          </article>

          <article>
            <span>
              EM ANDAMENTO
            </span>

            <strong className="event-green">
              {
                events.filter(
                  (event) =>
                    event.status === 'in_progress'
                ).length
              }
            </strong>
          </article>

          <article>
            <span>
              PROGRAMADOS
            </span>

            <strong className="event-blue">
              {
                events.filter(
                  (event) =>
                    event.status === 'scheduled'
                ).length
              }
            </strong>
          </article>

          <article>
            <span>
              FINALIZADOS
            </span>

            <strong>
              {
                events.filter(
                  (event) =>
                    event.status === 'completed'
                ).length
              }
            </strong>
          </article>

        </section>

        <section className="events-toolbar">

          <div className="events-search">

            <Search />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar por evento, cliente ou local..."
            />

          </div>

          <div className="events-toolbar-actions">

            <div className="event-filter">

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as Filter)
                }
              >
                <option value="all">
                  Todos
                </option>

                <option value="in_progress">
                  Em andamento
                </option>

                <option value="scheduled">
                  Programados
                </option>

                <option value="completed">
                  Finalizados
                </option>

                <option value="cancelled">
                  Cancelados
                </option>
              </select>

              <ChevronDown />

            </div>

            <button
              className="new-event-btn"
              onClick={() =>
                setModalOpen(true)
              }
            >
              <Plus />
              Novo evento
            </button>

          </div>

        </section>

        <section className="events-list-card">

          {loading ? (
            <div className="events-empty">
              Carregando eventos...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="events-empty">

              <CalendarDays />

              <strong>
                Nenhum evento encontrado
              </strong>

              <span>
                Cadastre o primeiro evento para começar.
              </span>

            </div>
          ) : (
            <div className="events-table-scroll">

              <table className="management-table">

                <thead>

                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Local</th>
                    <th>Período</th>
                    <th>Equipe</th>
                    <th>Status</th>

                    {owner && (
                      <th>Contrato</th>
                    )}
                  </tr>

                </thead>

                <tbody>

                  {filteredEvents.map((event) => (
                    <tr key={event.id}>

                      <td>

                        <div className="event-name-cell">

                          <div className="table-icon">
                            <Calendar />
                          </div>

                          <div>
                            <strong>
                              {event.name}
                            </strong>

                            <span>
                              {event.start_time
                                ? event.start_time.slice(0, 5)
                                : 'Horário não informado'}
                            </span>
                          </div>

                        </div>

                      </td>

                      <td>
                        {getClientName(event)}
                      </td>

                      <td>

                        <div className="table-location">
                          <MapPin />
                          {event.location || '-'}
                        </div>

                      </td>

                      <td>
                        {formatDate(event.start_date)}
                        {' - '}
                        {formatDate(event.end_date)}
                      </td>

                      <td>

                        <div className="table-workers">
                          <Users />
                          {event.workers_needed}
                        </div>

                      </td>

                      <td>
                        <span
                          className={`event-status status-${event.status}`}
                        >
                          {statusLabel(event.status)}
                        </span>
                      </td>

                      {owner && (
                        <td>
                          {formatMoney(
                            event.contract_value
                          )}
                        </td>
                      )}

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
          onMouseDown={() =>
            setModalOpen(false)
          }
        >

          <div
            className="event-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="event-modal-header">

              <div>
                <span className="eyebrow">
                  NOVO CADASTRO
                </span>

                <h2>
                  Novo evento
                </h2>

                <p>
                  Cadastre os dados principais da operação.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
              >
                <X />
              </button>

            </div>

            <form
              className="event-form"
              onSubmit={createEvent}
            >

              <div className="event-form-grid">

                <label className="event-field event-field-wide">

                  <span>
                    Nome do evento *
                  </span>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Ex.: Expo Center Norte"
                  />

                </label>

                <label className="event-field">

                  <span>
                    Cliente
                  </span>

                  <select
                    value={clientId}
                    onChange={(e) =>
                      setClientId(e.target.value)
                    }
                  >

                    <option value="">
                      Sem cliente
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name}
                      </option>
                    ))}

                  </select>

                </label>

                <label className="event-field">

                  <span>
                    Local
                  </span>

                  <input
                    value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="Local do evento"
                  />

                </label>

                <label className="event-field">

                  <span>
                    Data inicial *
                  </span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                  />

                </label>

                <label className="event-field">

                  <span>
                    Data final *
                  </span>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                  />

                </label>

                <label className="event-field">

                  <span>
                    Horário inicial
                  </span>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) =>
                      setStartTime(e.target.value)
                    }
                  />

                </label>

                <label className="event-field">

                  <span>
                    Horário final
                  </span>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) =>
                      setEndTime(e.target.value)
                    }
                  />

                </label>

                <label className="event-field">

                  <span>
                    Trabalhadores necessários
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={workersNeeded}
                    onChange={(e) =>
                      setWorkersNeeded(e.target.value)
                    }
                  />

                </label>

                <label className="event-field">

                  <span>
                    Status
                  </span>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as typeof status
                      )
                    }
                  >
                    <option value="draft">
                      Rascunho
                    </option>

                    <option value="scheduled">
                      Programado
                    </option>

                    <option value="in_progress">
                      Em andamento
                    </option>

                    <option value="completed">
                      Finalizado
                    </option>

                    <option value="cancelled">
                      Cancelado
                    </option>
                  </select>

                </label>

                {owner && (
                  <label className="event-field">

                    <span>
                      Valor do contrato
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contractValue}
                      onChange={(e) =>
                        setContractValue(
                          e.target.value
                        )
                      }
                    />

                  </label>
                )}

                <label className="event-field">

                  <span>
                    Valor da marmita
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mealValue}
                    onChange={(e) =>
                      setMealValue(e.target.value)
                    }
                  />

                </label>

                <label className="event-field event-field-wide">

                  <span>
                    Observações
                  </span>

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Informações importantes sobre o evento..."
                  />

                </label>

              </div>

              <div className="event-form-actions">

                <button
                  type="button"
                  className="event-cancel-btn"
                  onClick={() =>
                    setModalOpen(false)
                  }
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
                    : 'Criar evento'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  )
}
