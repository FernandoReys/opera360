'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  LogOut,
  Moon,
  Search,
  Sun,
  Plus,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Printer,
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
  created_at: string
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

function todayForInput() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10)
}

type EventSchedule = {
  id: string
  work_date: string
  worker_id: string
  workers: { full_name: string } | { full_name: string }[] | null
}

export default function EventosClient({
  email,
  fullName,
  role,
}: EventosProps) {
  const router = useRouter()
  const today = todayForInput()

  const [dark, setDark] = useState(true)
  const [events, setEvents] = useState<EventItem[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [finishingEventId, setFinishingEventId] = useState<string | null>(null)
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null)
  const [detailSchedules, setDetailSchedules] = useState<EventSchedule[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

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

  const displayName =
    fullName && fullName.trim() && fullName !== 'Usuário'
      ? fullName.trim()
      : email.split('@')[0]

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
          .eq('entity_type', 'events')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de eventos:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let eventsQuery = supabase
      .from('events')
      .select(`
        id,
        name,
        created_at,
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
      .order('start_date', { ascending: false })

    if (hiddenBefore) {
      eventsQuery = eventsQuery.gt('created_at', hiddenBefore)
    }

    const [eventsResponse, clientsResponse] = await Promise.all([
      eventsQuery,

      supabase
        .from('clients')
        .select('id, name')
        .eq('active', true)
        .order('name'),
    ])

    if (eventsResponse.error) {
      console.error(
        'Erro ao carregar eventos:',
        eventsResponse.error.message
      )
      setEvents([])
    } else {
      setEvents((eventsResponse.data ?? []) as EventItem[])
    }

    if (clientsResponse.error) {
      console.error(
        'Erro ao carregar clientes:',
        clientsResponse.error.message
      )
      setClients([])
    } else {
      setClients(clientsResponse.data ?? [])
    }

    setLoading(false)
  }

  const filteredEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return events.filter((event) => {
      const clientName = getClientName(event)

      const matchesSearch =
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        clientName.toLowerCase().includes(search.toLowerCase()) ||
        (event.location ?? '').toLowerCase().includes(search.toLowerCase())

      const matchesFilter =
        filter === 'all'
          ? event.status !== 'completed'
          : event.status === filter

      return matchesSearch && matchesFilter
    }).sort((a, b) => {
      const dateA = new Date(`${a.start_date}T12:00:00`)
      const dateB = new Date(`${b.start_date}T12:00:00`)
      const offsetA = dateA.getTime() - today.getTime()
      const offsetB = dateB.getTime() - today.getTime()

      if (offsetA >= 0 && offsetB >= 0) return offsetA - offsetB
      if (offsetA >= 0) return -1
      if (offsetB >= 0) return 1
      return offsetB - offsetA
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

  async function finishEvent(event: EventItem) {
    const confirmed = window.confirm(
      `Finalizar o evento “${event.name}”? Ele sairá da lista operacional, mas continuará disponível no filtro Finalizados.`
    )

    if (!confirmed) return

    setFinishingEventId(event.id)

    const supabase = createClient()
    const { error } = await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('id', event.id)

    setFinishingEventId(null)

    if (error) {
      alert(`Não foi possível finalizar o evento: ${error.message}`)
      return
    }

    setEvents((current) =>
      current.map((item) =>
        item.id === event.id ? { ...item, status: 'completed' } : item
      )
    )
    setExpandedEventId(null)
  }

  function scheduleWorkerName(schedule: EventSchedule) {
    if (!schedule.workers) return 'Trabalhador não identificado'
    return Array.isArray(schedule.workers)
      ? schedule.workers[0]?.full_name ?? 'Trabalhador não identificado'
      : schedule.workers.full_name
  }

  const detailDays = useMemo(
    () => [...new Set(detailSchedules.map((schedule) => schedule.work_date))].sort(),
    [detailSchedules]
  )

  const detailWorkers = useMemo(
    () => [...new Set(detailSchedules.map(scheduleWorkerName))].filter(Boolean).sort(),
    [detailSchedules]
  )

  async function openCompletedEvent(event: EventItem) {
    setDetailEvent(event)
    setDetailSchedules([])
    setDetailLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('schedules')
      .select('id, work_date, worker_id, workers ( full_name )')
      .eq('event_id', event.id)
      .order('work_date', { ascending: true })

    setDetailLoading(false)

    if (error) {
      alert(`Não foi possível carregar os dados do evento: ${error.message}`)
      return
    }

    setDetailSchedules((data ?? []) as EventSchedule[])
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function printCompletedEvent() {
    if (!detailEvent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const daysHtml = detailDays.length
      ? detailDays.map((day) => `<li>${formatDate(day)}</li>`).join('')
      : '<li>Nenhuma escala cadastrada</li>'
    const workersHtml = detailWorkers.length
      ? detailWorkers.map((worker) => `<li>${escapeHtml(worker)}</li>`).join('')
      : '<li>Nenhum trabalhador escalado</li>'

    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Resumo - ${escapeHtml(detailEvent.name)}</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:36px}header{border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:26px}.tag{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:1px}h1{margin:5px 0;font-size:27px}h2{font-size:16px;margin:26px 0 10px}dl{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:0}dt{font-size:11px;color:#667085;text-transform:uppercase;font-weight:700}dd{margin:4px 0 0;font-size:14px;font-weight:700}section{margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}ul{margin:8px 0;padding-left:20px;columns:2}.footer{margin-top:32px;color:#667085;font-size:11px}@media print{body{margin:20px}}</style></head><body><header><div class="tag">OPERA360 - EVENTO FINALIZADO</div><h1>${escapeHtml(detailEvent.name)}</h1></header><section><dl><div><dt>Cliente</dt><dd>${escapeHtml(getClientName(detailEvent))}</dd></div><div><dt>Local</dt><dd>${escapeHtml(detailEvent.location || 'Não informado')}</dd></div><div><dt>Período</dt><dd>${formatDate(detailEvent.start_date)} a ${formatDate(detailEvent.end_date)}</dd></div><div><dt>Horário</dt><dd>${detailEvent.start_time?.slice(0, 5) || '--:--'} - ${detailEvent.end_time?.slice(0, 5) || '--:--'}</dd></div><div><dt>Dias de operação</dt><dd>${detailDays.length}</dd></div><div><dt>Trabalhadores escalados</dt><dd>${detailWorkers.length}</dd></div></dl></section><h2>Dias do evento</h2><ul>${daysHtml}</ul><h2>Equipe escalada</h2><ul>${workersHtml}</ul><p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}.</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
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

    if (startDate < today) {
      alert('A data inicial deve ser hoje ou uma data futura.')
      return
    }

    if (endDate < startDate) {
      alert('A data final não pode ser anterior à data inicial.')
      return
    }

    if (startTime && endTime && endTime <= startTime) {
      alert('O horário final precisa ser maior que o horário inicial.')
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
        fullName={displayName}
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
                Nenhum evento visível
              </strong>

              <span>
                Cadastre um novo evento para começar.
              </span>
            </div>
          ) : (
            <div className="event-cards-grid">
              {filteredEvents.map((event) => {
                const expanded = expandedEventId === event.id

                return (
                  <article className={`event-operation-card ${expanded ? 'expanded' : ''}`} key={event.id}>
                    <button
                      type="button"
                      className="event-operation-summary"
                      onClick={() =>
                        event.status === 'completed'
                          ? void openCompletedEvent(event)
                          : setExpandedEventId(expanded ? null : event.id)
                      }
                      aria-expanded={expanded}
                    >
                      <div className="event-operation-icon"><Calendar /></div>
                      <div className="event-operation-content">
                        <span className="event-operation-label">EVENTO</span>
                        <h3>{event.name}</h3>
                        <div className="event-operation-details">
                          <div><span>Período</span><strong>{formatDate(event.start_date)} - {formatDate(event.end_date)}</strong></div>
                          <div><span>Trabalhadores</span><strong>{event.workers_needed}</strong></div>
                        </div>
                      </div>
                      {event.status === 'completed' ? (
                        <span className="event-history-open">Abrir resumo</span>
                      ) : (
                        <ChevronDown className="event-expand-icon" />
                      )}
                    </button>

                    {expanded && (
                      <div className="event-operation-folder">
                        <div><span>Cliente</span><strong>{getClientName(event)}</strong></div>
                        <div><span>Local</span><strong>{event.location || 'Não informado'}</strong></div>
                        <div><span>Horário</span><strong>{event.start_time?.slice(0, 5) || '--:--'} - {event.end_time?.slice(0, 5) || '--:--'}</strong></div>
                        <div><span>Contrato</span><strong>{formatMoney(event.contract_value)}</strong></div>
                        <div><span>Marmita por pessoa</span><strong>{formatMoney(event.meal_value)}</strong></div>
                        {event.notes && <div className="event-folder-notes"><span>Observações</span><strong>{event.notes}</strong></div>}
                      </div>
                    )}

                    {event.status === 'completed' ? (
                      <div className="event-operation-actions event-history-action">
                        <button type="button" onClick={() => void openCompletedEvent(event)}>Ver resumo completo</button>
                      </div>
                    ) : (
                      <div className="event-operation-actions">
                        <button type="button" onClick={() => router.push(`/escalas?eventId=${event.id}`)}>Montar escala</button>
                        <button type="button" className="event-operation-secondary" onClick={() => router.push(`/presencas?eventId=${event.id}`)}>Ver presença</button>
                        <button
                          type="button"
                          className="event-operation-finish"
                          disabled={finishingEventId === event.id}
                          onClick={() => finishEvent(event)}
                        >
                          <CheckCircle2 />
                          {finishingEventId === event.id ? 'Finalizando...' : 'Finalizar evento'}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {detailEvent && (
        <div className="completed-event-overlay" role="dialog" aria-modal="true">
          <section className="completed-event-screen">
            <header className="completed-event-screen-header">
              <div>
                <span>EVENTO FINALIZADO</span>
                <h2>{detailEvent.name}</h2>
                <p>{formatDate(detailEvent.start_date)} a {formatDate(detailEvent.end_date)}</p>
              </div>
              <div className="completed-event-header-actions">
                {owner && (
                  <button type="button" className="completed-event-closure" onClick={() => router.push(`/fechamento?eventId=${detailEvent.id}`)}>Ver fechamento</button>
                )}
                <button type="button" className="completed-event-pdf" onClick={printCompletedEvent}><Printer /> Gerar PDF</button>
                <button type="button" className="completed-event-close" onClick={() => setDetailEvent(null)} aria-label="Fechar"><X /></button>
              </div>
            </header>

            {detailLoading ? (
              <div className="completed-event-loading">Carregando informações do evento...</div>
            ) : (
              <div className="completed-event-content">
                <section className="completed-event-metrics">
                  <div><span>Cliente</span><strong>{getClientName(detailEvent)}</strong></div>
                  <div><span>Local</span><strong>{detailEvent.location || 'Não informado'}</strong></div>
                  <div><span>Dias de operação</span><strong>{detailDays.length || 0}</strong></div>
                  <div><span>Trabalhadores escalados</span><strong>{detailWorkers.length || 0}</strong></div>
                </section>

                <section className="completed-event-section">
                  <h3>Dias do evento</h3>
                  <div className="completed-event-chips">
                    {detailDays.length ? detailDays.map((day) => <span key={day}>{formatDate(day)}</span>) : <p>Nenhuma escala cadastrada.</p>}
                  </div>
                </section>

                <section className="completed-event-section">
                  <h3>Equipe que participou da escala</h3>
                  <div className="completed-event-workers">
                    {detailWorkers.length ? detailWorkers.map((worker) => <span key={worker}>{worker}</span>) : <p>Nenhum trabalhador escalado.</p>}
                  </div>
                </section>

                {detailEvent.notes && <section className="completed-event-section"><h3>Observações</h3><p>{detailEvent.notes}</p></section>}
              </div>
            )}
          </section>
        </div>
      )}

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
                    min={today}
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
                    min={startDate || today}
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
