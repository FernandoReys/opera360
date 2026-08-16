'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppSidebar from '@/components/AppSidebar'
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  LogOut,
  Moon,
  Search,
  Sun,
  User,
  CalendarDays,
  X,
  Plus,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type AdiantamentosProps = {
  email: string
  fullName: string
  role: string
}

type WorkerItem = {
  id: string
  full_name: string
  role_name: string
}

type EventItem = {
  id: string
  name: string
}

type AdvanceItem = {
  id: string
  amount: number
  advance_type: 'transport' | 'cash' | 'other'
  advance_date: string
  notes: string | null
  settled: boolean
  workers:
    | {
        id: string
        full_name: string
      }
    | {
        id: string
        full_name: string
      }[]
    | null
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

export default function AdiantamentosClient({
  email,
  fullName,
  role,
}: AdiantamentosProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)

  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [advances, setAdvances] = useState<AdvanceItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [modalOpen, setModalOpen] = useState(false)

  const [workerId, setWorkerId] = useState('')
  const [eventId, setEventId] = useState('')
  const [amount, setAmount] = useState('')
  const [advanceType, setAdvanceType] = useState<
    'transport' | 'cash' | 'other'
  >('transport')
  const [advanceDate, setAdvanceDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark
      ? 'dark'
      : 'light'

    setAdvanceDate(new Date().toISOString().slice(0, 10))

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

    const [workersResponse, eventsResponse, advancesResponse] =
      await Promise.all([
        supabase
          .from('workers')
          .select('id, full_name, role_name')
          .eq('active', true)
          .order('full_name'),

        supabase
          .from('events')
          .select('id, name')
          .order('start_date', { ascending: false }),

        supabase
          .from('advances')
          .select(`
            id,
            amount,
            advance_type,
            advance_date,
            notes,
            settled,
            workers (
              id,
              full_name
            ),
            events (
              id,
              name
            )
          `)
          .order('advance_date', { ascending: false }),
      ])

    if (!workersResponse.error) {
      setWorkers(workersResponse.data ?? [])
    }

    if (!eventsResponse.error) {
      setEvents(eventsResponse.data ?? [])
    }

    if (advancesResponse.error) {
      console.error(
        'Erro ao carregar adiantamentos:',
        advancesResponse.error.message
      )
      setAdvances([])
    } else {
      setAdvances((advancesResponse.data ?? []) as AdvanceItem[])
    }

    setLoading(false)
  }

  function getWorkerName(item: AdvanceItem) {
    if (!item.workers) return '-'

    if (Array.isArray(item.workers)) {
      return item.workers[0]?.full_name ?? '-'
    }

    return item.workers.full_name
  }

  function getEventName(item: AdvanceItem) {
    if (!item.events) return 'Sem evento'

    if (Array.isArray(item.events)) {
      return item.events[0]?.name ?? 'Sem evento'
    }

    return item.events.name
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0)
  }

  function formatDate(date: string) {
    if (!date) return '-'

    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  function typeLabel(type: AdvanceItem['advance_type']) {
    switch (type) {
      case 'transport':
        return 'Transporte'
      case 'cash':
        return 'Dinheiro'
      case 'other':
        return 'Outro'
    }
  }

  const filteredAdvances = useMemo(() => {
    const query = search.trim().toLowerCase()

    return advances.filter((item) => {
      const matchesSearch =
        !query ||
        getWorkerName(item).toLowerCase().includes(query) ||
        getEventName(item).toLowerCase().includes(query) ||
        typeLabel(item.advance_type).toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'settled'
            ? item.settled
            : !item.settled

      return matchesSearch && matchesStatus
    })
  }, [advances, search, statusFilter])

  const summary = useMemo(() => {
    const openItems = advances.filter((item) => !item.settled)
    const settledItems = advances.filter((item) => item.settled)

    return {
      total: advances.length,
      openCount: openItems.length,
      openValue: openItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
      settledCount: settledItems.length,
      settledValue: settledItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    }
  }, [advances])

  function resetForm() {
    setWorkerId('')
    setEventId('')
    setAmount('')
    setAdvanceType('transport')
    setAdvanceDate(new Date().toISOString().slice(0, 10))
    setNotes('')
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  async function createAdvance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!workerId) {
      alert('Selecione o trabalhador.')
      return
    }

    const numericAmount = Number(amount || 0)

    if (numericAmount <= 0) {
      alert('Informe um valor maior que zero.')
      return
    }

    if (!advanceDate) {
      alert('Informe a data do adiantamento.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase.from('advances').insert({
      worker_id: workerId,
      event_id: eventId || null,
      amount: numericAmount,
      advance_type: advanceType,
      advance_date: advanceDate,
      notes: notes.trim() || null,
      settled: false,
    })

    setSaving(false)

    if (error) {
      alert(`Erro ao cadastrar adiantamento: ${error.message}`)
      return
    }

    closeModal()
    await loadData()
  }

  async function toggleSettled(item: AdvanceItem) {
    setSavingId(item.id)

    const supabase = createClient()

    const { error } = await supabase
      .from('advances')
      .update({
        settled: !item.settled,
      })
      .eq('id', item.id)

    setSavingId(null)

    if (error) {
      alert(`Erro ao atualizar adiantamento: ${error.message}`)
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
            <span className="eyebrow">FINANCEIRO</span>
            <h1>Adiantamentos</h1>
            <p>
              Registre valores antecipados aos trabalhadores e acompanhe os
              descontos pendentes.
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

        <section className="advance-summary">
          <article>
            <span>REGISTROS</span>
            <strong>{summary.total}</strong>
          </article>

          <article>
            <span>EM ABERTO</span>
            <strong className="attendance-orange">
              {summary.openCount}
            </strong>
            <small>{formatMoney(summary.openValue)}</small>
          </article>

          <article>
            <span>QUITADOS</span>
            <strong className="attendance-green">
              {summary.settledCount}
            </strong>
            <small>{formatMoney(summary.settledValue)}</small>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar trabalhador, evento ou tipo..."
            />
          </div>

          <div className="events-toolbar-actions">
            <div className="event-filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="open">Em aberto</option>
                <option value="settled">Quitados</option>
                <option value="all">Todos</option>
              </select>
            </div>

            <button
              className="new-event-btn"
              onClick={() => setModalOpen(true)}
            >
              <Plus />
              Novo adiantamento
            </button>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">
              Carregando adiantamentos...
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="events-empty">
              <BriefcaseBusiness />
              <strong>Nenhum adiantamento encontrado</strong>
              <span>
                Cadastre o primeiro adiantamento para começar.
              </span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table advance-table">
                <thead>
                  <tr>
                    <th>Trabalhador</th>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAdvances.map((item) => {
                    const savingItem = savingId === item.id

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="event-name-cell">
                            <div className="table-icon">
                              <User />
                            </div>

                            <div>
                              <strong>
                                {getWorkerName(item)}
                              </strong>
                              <span>
                                {item.notes || 'Sem observações'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="table-location">
                            <CalendarDays />
                            {getEventName(item)}
                          </div>
                        </td>

                        <td>{formatDate(item.advance_date)}</td>

                        <td>{typeLabel(item.advance_type)}</td>

                        <td>
                          <strong className="advance-value">
                            {formatMoney(item.amount)}
                          </strong>
                        </td>

                        <td>
                          {item.settled ? (
                            <span className="attendance-status attendance-present">
                              <CheckCircle2 />
                              Quitado
                            </span>
                          ) : (
                            <span className="attendance-status attendance-pending">
                              <CircleDollarSign />
                              Em aberto
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              item.settled
                                ? 'advance-reopen-btn'
                                : 'advance-settle-btn'
                            }
                            disabled={savingItem}
                            onClick={() => toggleSettled(item)}
                          >
                            {item.settled
                              ? 'Reabrir'
                              : 'Quitar'}
                          </button>
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
                  NOVO REGISTRO
                </span>

                <h2>Novo adiantamento</h2>

                <p>
                  Registre o valor antecipado ao trabalhador.
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
              onSubmit={createAdvance}
            >
              <div className="event-form-grid">
                <label className="event-field">
                  <span>Trabalhador *</span>

                  <select
                    value={workerId}
                    onChange={(e) =>
                      setWorkerId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Selecione
                    </option>

                    {workers.map((worker) => (
                      <option
                        key={worker.id}
                        value={worker.id}
                      >
                        {worker.full_name} - {worker.role_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="event-field">
                  <span>Evento</span>

                  <select
                    value={eventId}
                    onChange={(e) =>
                      setEventId(e.target.value)
                    }
                  >
                    <option value="">
                      Sem evento
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
                  <span>Tipo *</span>

                  <select
                    value={advanceType}
                    onChange={(e) =>
                      setAdvanceType(
                        e.target.value as
                          | 'transport'
                          | 'cash'
                          | 'other'
                      )
                    }
                  >
                    <option value="transport">
                      Transporte
                    </option>

                    <option value="cash">
                      Dinheiro
                    </option>

                    <option value="other">
                      Outro
                    </option>
                  </select>
                </label>

                <label className="event-field">
                  <span>Valor *</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    placeholder="0,00"
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Data *</span>

                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) =>
                      setAdvanceDate(e.target.value)
                    }
                    required
                  />
                </label>

                <label className="event-field event-field-wide">
                  <span>Observações</span>

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Ex.: transporte para ida ao evento..."
                  />
                </label>
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
                    : 'Cadastrar adiantamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}