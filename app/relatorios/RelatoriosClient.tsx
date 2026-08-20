'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  LogOut,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  email: string
  fullName: string
  role: string
}

type EventRow = {
  id: string
  name: string
  start_date: string
  end_date: string
  workers_needed: number
  contract_value: number
  status: string
  clients:
    | { name: string }
    | { name: string }[]
    | null
}

type PaymentRow = {
  work_date: string
  total_value: number
  payment_status: string
}

type MealRow = {
  meal_date: string
  quantity: number
  total_value: number
  status: string
}

type TransportRow = {
  transport_date: string
  workers_quantity: number
  total_value: number
  status: string
}

type AdvanceRow = {
  advance_date: string
  amount: number
  settled: boolean
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function brDate(value: string) {
  if (!value) return '-'
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

function clientName(event: EventRow) {
  if (!event.clients) return 'Sem cliente'
  if (Array.isArray(event.clients)) {
    return event.clients[0]?.name ?? 'Sem cliente'
  }
  return event.clients.name
}

export default function RelatoriosClient({
  email,
  fullName,
  role,
}: Props) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<EventRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [meals, setMeals] = useState<MealRow[]>([])
  const [transports, setTransports] = useState<TransportRow[]>([])
  const [advances, setAdvances] = useState<AdvanceRow[]>([])

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const displayName =
    fullName && fullName.trim() && fullName !== 'Usuário'
      ? fullName.trim()
      : email.split('@')[0]

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth(), 1)

    setStartDate(first.toISOString().slice(0, 10))
    setEndDate(today.toISOString().slice(0, 10))

    void loadData()
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

    const [
      eventsResponse,
      paymentsResponse,
      mealsResponse,
      transportsResponse,
      advancesResponse,
    ] = await Promise.all([
      supabase
        .from('events')
        .select(`
          id,
          name,
          start_date,
          end_date,
          workers_needed,
          contract_value,
          status,
          clients (name)
        `)
        .order('start_date', { ascending: false }),

      supabase
        .from('payments')
        .select('work_date, total_value, payment_status'),

      supabase
        .from('meals')
        .select('meal_date, quantity, total_value, status'),

      supabase
        .from('transports')
        .select('transport_date, workers_quantity, total_value, status'),

      supabase
        .from('advances')
        .select('advance_date, amount, settled'),
    ])

    if (!eventsResponse.error) {
      setEvents((eventsResponse.data ?? []) as EventRow[])
    }

    if (!paymentsResponse.error) {
      setPayments((paymentsResponse.data ?? []) as PaymentRow[])
    }

    if (!mealsResponse.error) {
      setMeals((mealsResponse.data ?? []) as MealRow[])
    }

    if (!transportsResponse.error) {
      setTransports((transportsResponse.data ?? []) as TransportRow[])
    }

    if (!advancesResponse.error) {
      setAdvances((advancesResponse.data ?? []) as AdvanceRow[])
    }

    setLoading(false)
  }

  function inRange(date: string) {
    if (!date) return false
    if (startDate && date < startDate) return false
    if (endDate && date > endDate) return false
    return true
  }

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()

    return events.filter((event) => {
      const matchesPeriod =
        (!startDate || event.end_date >= startDate) &&
        (!endDate || event.start_date <= endDate)

      const matchesSearch =
        !q ||
        event.name.toLowerCase().includes(q) ||
        clientName(event).toLowerCase().includes(q)

      return matchesPeriod && matchesSearch
    })
  }, [events, search, startDate, endDate])

  const summary = useMemo(() => {
    const revenue = filteredEvents
      .filter((event) => event.status !== 'cancelled')
      .reduce((sum, event) => sum + Number(event.contract_value || 0), 0)

    const paymentCost = payments
      .filter((item) => inRange(item.work_date))
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const mealCost = meals
      .filter((item) => inRange(item.meal_date) && item.status !== 'cancelled')
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const transportCost = transports
      .filter(
        (item) =>
          inRange(item.transport_date) &&
          item.status !== 'cancelled'
      )
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const advanceValue = advances
      .filter((item) => inRange(item.advance_date))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    const costs = paymentCost + mealCost + transportCost
    const profit = revenue - costs

    return {
      revenue,
      costs,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      payments: paymentCost,
      meals: mealCost,
      transports: transportCost,
      advances: advanceValue,
    }
  }, [
    filteredEvents,
    payments,
    meals,
    transports,
    advances,
    startDate,
    endDate,
  ])

  function exportCsv() {
    const lines = [
      [
        'Evento',
        'Cliente',
        'Início',
        'Fim',
        'Trabalhadores',
        'Valor do contrato',
        'Status',
      ],
      ...filteredEvents.map((event) => [
        event.name,
        clientName(event),
        brDate(event.start_date),
        brDate(event.end_date),
        String(event.workers_needed),
        String(event.contract_value),
        event.status,
      ]),
    ]

    const csv = lines
      .map((line) =>
        line
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(';')
      )
      .join('\n')

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-eventos-${startDate || 'inicio'}-${endDate || 'fim'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={displayName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">GESTÃO</span>
            <h1>Relatórios</h1>
            <p>Consolide os principais dados operacionais e financeiros.</p>
          </div>

          <div className="dashboard-actions">
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

        <section className="report-filters">
          <label>
            <span>De</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            <span>Até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <div className="events-search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento ou cliente..."
            />
          </div>

          <button className="report-export-btn" onClick={exportCsv}>
            <Download />
            Exportar CSV
          </button>
        </section>

        <section className="report-summary">
          <article>
            <span>FATURAMENTO</span>
            <strong>{money(summary.revenue)}</strong>
          </article>

          <article>
            <span>CUSTOS</span>
            <strong className="report-cost">{money(summary.costs)}</strong>
          </article>

          <article>
            <span>LUCRO</span>
            <strong className={summary.profit >= 0 ? 'report-profit' : 'report-cost'}>
              {money(summary.profit)}
            </strong>
          </article>

          <article>
            <span>MARGEM</span>
            <strong>{summary.margin.toFixed(1)}%</strong>
          </article>
        </section>

        <section className="report-breakdown">
          <article>
            <span>Pagamentos</span>
            <strong>{money(summary.payments)}</strong>
          </article>
          <article>
            <span>Marmitas</span>
            <strong>{money(summary.meals)}</strong>
          </article>
          <article>
            <span>Transporte</span>
            <strong>{money(summary.transports)}</strong>
          </article>
          <article>
            <span>Adiantamentos no período</span>
            <strong>{money(summary.advances)}</strong>
          </article>
        </section>

        <section className="events-list-card">
          <div className="panel-header">
            <div>
              <h3>EVENTOS DO PERÍODO</h3>
              <span className="report-count">
                {loading ? 'Carregando...' : `${filteredEvents.length} evento(s)`}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="events-empty">Carregando relatório...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="events-empty">
              <FileSpreadsheet />
              <strong>Nenhum evento encontrado</strong>
              <span>Ajuste o período ou a busca.</span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table report-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Período</th>
                    <th>Trabalhadores</th>
                    <th>Contrato</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.name}</strong>
                      </td>
                      <td>{clientName(event)}</td>
                      <td>
                        <span className="table-location">
                          <CalendarDays />
                          {brDate(event.start_date)} - {brDate(event.end_date)}
                        </span>
                      </td>
                      <td>{event.workers_needed}</td>
                      <td>{money(event.contract_value)}</td>
                      <td>{event.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}