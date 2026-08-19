'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  LogOut,
  Moon,
  Sun,
  Search,
  Plus,
  X,
  UtensilsCrossed,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageCheck,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type MarmitasProps = {
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

type MealItem = {
  id: string
  event_id: string
  meal_date: string
  quantity: number
  unit_price: number
  total_value: number
  supplier: string | null
  status: 'planned' | 'ordered' | 'delivered' | 'cancelled'
  notes: string | null
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

export default function MarmitasClient({
  email,
  fullName,
  role,
}: MarmitasProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)

  const [events, setEvents] = useState<EventItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [meals, setMeals] = useState<MealItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)

  const [eventId, setEventId] = useState('')
  const [mealDate, setMealDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('20')
  const [supplier, setSupplier] = useState('')
  const [status, setStatus] = useState<
    'planned' | 'ordered' | 'delivered' | 'cancelled'
  >('planned')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

    setMealDate(new Date().toISOString().slice(0, 10))

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
          .eq('entity_type', 'meals')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de meals:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let mealsQuery = supabase
      .from('meals')
      .select(`
        id,
        event_id,
        meal_date,
        quantity,
        unit_price,
        total_value,
        supplier,
        status,
        notes,
        events (
          id,
          name
        )
      `)
      .order('meal_date', { ascending: false })

    if (hiddenBefore) {
      mealsQuery = mealsQuery.gt('created_at', hiddenBefore)
    }

    const [eventsResponse, schedulesResponse, mealsResponse] =
      await Promise.all([
        supabase
          .from('events')
          .select('id, name')
          .order('name'),

        supabase
          .from('schedules')
          .select('id, event_id, work_date'),

        mealsQuery,
      ])

    if (!eventsResponse.error) {
      setEvents(eventsResponse.data ?? [])
    }

    if (!schedulesResponse.error) {
      setSchedules((schedulesResponse.data ?? []) as ScheduleItem[])
    }

    if (mealsResponse.error) {
      console.error(
        'Erro ao carregar marmitas:',
        mealsResponse.error.message
      )
      setMeals([])
    } else {
      setMeals((mealsResponse.data ?? []) as MealItem[])
    }

    setLoading(false)
  }

  function getEventName(item: MealItem) {
    if (!item.events) return '-'

    if (Array.isArray(item.events)) {
      return item.events[0]?.name ?? '-'
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

  function statusLabel(value: MealItem['status']) {
    switch (value) {
      case 'planned':
        return 'Planejada'
      case 'ordered':
        return 'Pedida'
      case 'delivered':
        return 'Entregue'
      case 'cancelled':
        return 'Cancelada'
    }
  }

  function countScheduledWorkers(
    selectedEventId: string,
    selectedDate: string
  ) {
    if (!selectedEventId || !selectedDate) return 0

    return schedules.filter(
      (item) =>
        item.event_id === selectedEventId &&
        item.work_date === selectedDate
    ).length
  }

  const suggestedQuantity = useMemo(
    () => countScheduledWorkers(eventId, mealDate),
    [eventId, mealDate, schedules]
  )

  useEffect(() => {
    if (suggestedQuantity > 0 && !quantity) {
      setQuantity(String(suggestedQuantity))
    }
  }, [suggestedQuantity, quantity])

  const filteredMeals = useMemo(() => {
    const query = search.trim().toLowerCase()

    return meals.filter((item) => {
      const matchesSearch =
        !query ||
        getEventName(item).toLowerCase().includes(query) ||
        (item.supplier ?? '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [meals, search, statusFilter])

  const summary = useMemo(() => {
    const delivered = meals.filter(
      (item) => item.status === 'delivered'
    )

    const pending = meals.filter(
      (item) =>
        item.status === 'planned' ||
        item.status === 'ordered'
    )

    return {
      totalRecords: meals.length,
      totalQuantity: meals.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
      totalCost: meals
        .filter((item) => item.status !== 'cancelled')
        .reduce(
          (sum, item) => sum + Number(item.total_value || 0),
          0
        ),
      deliveredCount: delivered.length,
      pendingCount: pending.length,
    }
  }, [meals])

  function resetForm() {
    setEventId('')
    setMealDate(new Date().toISOString().slice(0, 10))
    setQuantity('')
    setUnitPrice('20')
    setSupplier('')
    setStatus('planned')
    setNotes('')
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  async function createMeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!eventId) {
      alert('Selecione o evento.')
      return
    }

    if (!mealDate) {
      alert('Informe a data.')
      return
    }

    const numericQuantity = Number(quantity || 0)
    const numericUnitPrice = Number(unitPrice || 0)

    if (numericQuantity <= 0) {
      alert('Informe uma quantidade maior que zero.')
      return
    }

    if (numericUnitPrice < 0) {
      alert('Informe um valor unitÃ¡rio vÃ¡lido.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const totalValue = numericQuantity * numericUnitPrice

    const { error } = await supabase
      .from('meals')
      .upsert(
        {
          event_id: eventId,
          meal_date: mealDate,
          quantity: numericQuantity,
          unit_price: numericUnitPrice,
          total_value: totalValue,
          supplier: supplier.trim() || null,
          status,
          notes: notes.trim() || null,
        },
        {
          onConflict: 'event_id,meal_date',
        }
      )

    setSaving(false)

    if (error) {
      alert(`Erro ao salvar marmitas: ${error.message}`)
      return
    }

    closeModal()
    await loadData()
  }

  async function changeStatus(
    item: MealItem,
    nextStatus: MealItem['status']
  ) {
    setSavingId(item.id)

    const supabase = createClient()

    const { error } = await supabase
      .from('meals')
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

  return (
    <div className="dashboard-shell">
      <AppSidebar
        fullName={fullName}
        role={role}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">OPERAÃ‡ÃƒO</span>
            <h1>Marmitas</h1>
            <p>
              Controle quantidade, fornecedor e custo das refeiÃ§Ãµes por evento.
            </p>
          </div>

          <div className="dashboard-actions">
            <button
              className="icon-btn"
              aria-label="NotificaÃ§Ãµes"
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

        <section className="meal-summary">
          <article>
            <span>REGISTROS</span>
            <strong>{summary.totalRecords}</strong>
          </article>

          <article>
            <span>MARMITAS</span>
            <strong>{summary.totalQuantity}</strong>
          </article>

          <article>
            <span>CUSTO TOTAL</span>
            <strong className="meal-cost">
              {formatMoney(summary.totalCost)}
            </strong>
          </article>

          <article>
            <span>PENDENTES</span>
            <strong className="attendance-orange">
              {summary.pendingCount}
            </strong>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento ou fornecedor..."
            />
          </div>

          <div className="events-toolbar-actions">
            <div className="event-filter">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="all">Todos</option>
                <option value="planned">Planejadas</option>
                <option value="ordered">Pedidas</option>
                <option value="delivered">Entregues</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>

            <button
              className="new-event-btn"
              onClick={() => setModalOpen(true)}
            >
              <Plus />
              Nova marmita
            </button>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">
              Carregando marmitas...
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className="events-empty">
              <UtensilsCrossed />

              <strong>
                Nenhum registro de marmita
              </strong>

              <span>
                Cadastre as refeiÃ§Ãµes do primeiro evento.
              </span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table meal-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Quantidade</th>
                    <th>Valor unitÃ¡rio</th>
                    <th>Total</th>
                    <th>Fornecedor</th>
                    <th>Status</th>
                    <th>AÃ§Ã£o</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMeals.map((item) => {
                    const savingItem =
                      savingId === item.id

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {getEventName(item)}
                          </strong>
                        </td>

                        <td>
                          <div className="table-location">
                            <CalendarDays />
                            {formatDate(item.meal_date)}
                          </div>
                        </td>

                        <td>
                          {item.quantity}
                        </td>

                        <td>
                          {formatMoney(item.unit_price)}
                        </td>

                        <td>
                          <strong className="meal-cost">
                            {formatMoney(item.total_value)}
                          </strong>
                        </td>

                        <td>
                          {item.supplier || '-'}
                        </td>

                        <td>
                          <span
                            className={`meal-status meal-status-${item.status}`}
                          >
                            {item.status === 'delivered' ? (
                              <CheckCircle2 />
                            ) : item.status === 'ordered' ? (
                              <PackageCheck />
                            ) : (
                              <Clock3 />
                            )}

                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <td>
                          <select
                            className="meal-status-select"
                            value={item.status}
                            disabled={savingItem}
                            onChange={(e) =>
                              changeStatus(
                                item,
                                e.target.value as MealItem['status']
                              )
                            }
                          >
                            <option value="planned">
                              Planejada
                            </option>
                            <option value="ordered">
                              Pedida
                            </option>
                            <option value="delivered">
                              Entregue
                            </option>
                            <option value="cancelled">
                              Cancelada
                            </option>
                          </select>
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
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <div className="event-modal-header">
              <div>
                <span className="eyebrow">
                  REFEIÃ‡Ã•ES
                </span>

                <h2>Nova marmita</h2>

                <p>
                  Informe o evento, data e quantidade.
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
              onSubmit={createMeal}
            >
              <div className="event-form-grid">
                <label className="event-field">
                  <span>Evento *</span>

                  <select
                    value={eventId}
                    onChange={(e) => {
                      setEventId(e.target.value)
                      setQuantity('')
                    }}
                    required
                  >
                    <option value="">
                      Selecione
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
                  <span>Data *</span>

                  <input
                    type="date"
                    value={mealDate}
                    onChange={(e) => {
                      setMealDate(e.target.value)
                      setQuantity('')
                    }}
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Quantidade *</span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value)
                    }
                    required
                  />

                  {suggestedQuantity > 0 && (
                    <small className="meal-suggestion">
                      Escalados nessa data: {suggestedQuantity}
                    </small>
                  )}
                </label>

                <label className="event-field">
                  <span>Valor por marmita *</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) =>
                      setUnitPrice(e.target.value)
                    }
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Fornecedor</span>

                  <input
                    value={supplier}
                    onChange={(e) =>
                      setSupplier(e.target.value)
                    }
                    placeholder="Nome do fornecedor"
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
                          | 'ordered'
                          | 'delivered'
                          | 'cancelled'
                      )
                    }
                  >
                    <option value="planned">
                      Planejada
                    </option>
                    <option value="ordered">
                      Pedida
                    </option>
                    <option value="delivered">
                      Entregue
                    </option>
                    <option value="cancelled">
                      Cancelada
                    </option>
                  </select>
                </label>

                <label className="event-field event-field-wide">
                  <span>ObservaÃ§Ãµes</span>

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Ex.: entregar Ã s 12h..."
                  />
                </label>
              </div>

              <div className="meal-preview">
                <span>Total previsto</span>
                <strong>
                  {formatMoney(
                    Number(quantity || 0) *
                    Number(unitPrice || 0)
                  )}
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
                  {saving
                    ? 'Salvando...'
                    : 'Salvar marmitas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}