'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  UsersRound,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Menu,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type DashboardProps = {
  email: string
  fullName: string
  role: string
}

type EventItem = {
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

type ScheduleItem = {
  worker_id: string
  event_id: string
  work_date: string
}

type PaymentItem = {
  work_date: string
  daily_rate: number
  transport_value: number
  advance_value: number
  extra_value: number
  discount_value: number
  total_value: number
  payment_status: string
}

type MealItem = {
  meal_date: string
  total_value: number
  status: string
}

type TransportItem = {
  transport_date: string
  total_value: number
  status: string
}

type AdvanceItem = {
  advance_date: string
  amount: number
  settled: boolean
}

type DayBucket = {
  key: string
  label: string
  revenue: number
  costs: number
  profit: number
  cashIn: number
  cashOut: number
}

type CostBreakdown = {
  labor: number
  transport: number
  meals: number
  other: number
}

type ChartPoint = {
  x: number
  y: number
}

function safeNumber(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function toDateOnly(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(value: string) {
  return value?.slice(0, 7) ?? ''
}

function getClientName(event: EventItem) {
  if (!event.clients) return 'Sem cliente'
  if (Array.isArray(event.clients)) {
    return event.clients[0]?.name ?? 'Sem cliente'
  }
  return event.clients.name
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompactMoney(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)} mi`
  }

  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)} mil`
  }

  return formatMoney(value)
}

function formatDate(value: string) {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function getDayBuckets(selectedMonth: string) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const result: DayBucket[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dayLabel = String(day).padStart(2, '0')

    result.push({
      key: `${selectedMonth}-${dayLabel}`,
      label: dayLabel,
      revenue: 0,
      costs: 0,
      profit: 0,
      cashIn: 0,
      cashOut: 0,
    })
  }

  return result
}

function chartPoints(
  values: number[],
  maxValue: number,
  width = 700,
  height = 220
): ChartPoint[] {
  if (values.length === 0) return []

  const safeMax = Math.max(maxValue, 1)

  return values.map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width

      const normalized = Math.max(0, value) / safeMax
      const y = height - normalized * (height - 30) - 15

      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
    })
}

function smoothLinePath(points: ChartPoint[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`

    const previous = points[index - 1]
    const middleX = Number(((previous.x + point.x) / 2).toFixed(1))

    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`
  }, '')
}

function areaPath(points: ChartPoint[], baseline = 220) {
  if (points.length === 0) return ''

  const first = points[0]
  const last = points[points.length - 1]

  return `${smoothLinePath(points)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
}

export default function DashboardClient({
  email,
  fullName,
  role,
}: DashboardProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartMonth, setChartMonth] = useState(() =>
    monthKey(toDateOnly(new Date()))
  )

  const [events, setEvents] = useState<EventItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [meals, setMeals] = useState<MealItem[]>([])
  const [transports, setTransports] = useState<TransportItem[]>([])
  const [advances, setAdvances] = useState<AdvanceItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

    void loadDashboard()
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

  async function loadDashboard() {
    setLoading(true)

    const supabase = createClient()

    const [
      eventsResponse,
      schedulesResponse,
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
          clients (
            name
          )
        `)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true }),

      supabase
        .from('schedules')
        .select('worker_id, event_id, work_date'),

      supabase
        .from('payments')
        .select(`
          work_date,
          daily_rate,
          transport_value,
          advance_value,
          extra_value,
          discount_value,
          total_value,
          payment_status
        `),

      supabase
        .from('meals')
        .select('meal_date, total_value, status'),

      supabase
        .from('transports')
        .select('transport_date, total_value, status'),

      supabase
        .from('advances')
        .select('advance_date, amount, settled'),
    ])

    if (eventsResponse.error) {
      console.error('Erro ao carregar eventos:', eventsResponse.error.message)
    } else {
      setEvents((eventsResponse.data ?? []) as EventItem[])
    }

    if (schedulesResponse.error) {
      console.error('Erro ao carregar escalas:', schedulesResponse.error.message)
    } else {
      setSchedules((schedulesResponse.data ?? []) as ScheduleItem[])
    }

    if (paymentsResponse.error) {
      console.error('Erro ao carregar pagamentos:', paymentsResponse.error.message)
    } else {
      setPayments((paymentsResponse.data ?? []) as PaymentItem[])
    }

    if (mealsResponse.error) {
      console.error('Erro ao carregar marmitas:', mealsResponse.error.message)
    } else {
      setMeals((mealsResponse.data ?? []) as MealItem[])
    }

    if (transportsResponse.error) {
      console.error('Erro ao carregar transportes:', transportsResponse.error.message)
    } else {
      setTransports((transportsResponse.data ?? []) as TransportItem[])
    }

    if (advancesResponse.error) {
      console.error('Erro ao carregar adiantamentos:', advancesResponse.error.message)
    } else {
      setAdvances((advancesResponse.data ?? []) as AdvanceItem[])
    }

    setLoading(false)
  }

  const owner = role === 'owner'

  const displayName =
    fullName && fullName.trim() && fullName !== 'Usuário'
      ? fullName.trim()
      : email.split('@')[0]

  const today = toDateOnly(new Date())
  const currentMonth = today.slice(0, 7)

  const operationalEvents = useMemo(() => {
    return events
      .filter(
        (event) =>
          event.status !== 'cancelled' &&
          event.status !== 'completed' &&
          event.end_date >= today
      )
      .sort((first, second) =>
        first.start_date.localeCompare(second.start_date)
      )
      .slice(0, 6)
  }, [events, today])

  const activeWorkersToday = useMemo(() => {
    return new Set(
      schedules
        .filter((schedule) => schedule.work_date === today)
        .map((schedule) => schedule.worker_id)
    ).size
  }, [schedules, today])

  const costBreakdown = useMemo<CostBreakdown>(() => {
    const monthPayments = payments.filter(
      (payment) => monthKey(payment.work_date) === currentMonth
    )

    const labor = monthPayments.reduce((sum, payment) => {
      return (
        sum +
        safeNumber(payment.daily_rate) +
        safeNumber(payment.extra_value) -
        safeNumber(payment.discount_value)
      )
    }, 0)

    const workerTransport = monthPayments.reduce(
      (sum, payment) => sum + safeNumber(payment.transport_value),
      0
    )

    const transportOperations = transports
      .filter(
        (transport) =>
          monthKey(transport.transport_date) === currentMonth &&
          transport.status !== 'cancelled'
      )
      .reduce(
        (sum, transport) => sum + safeNumber(transport.total_value),
        0
      )

    const mealCost = meals
      .filter(
        (meal) =>
          monthKey(meal.meal_date) === currentMonth &&
          meal.status !== 'cancelled'
      )
      .reduce((sum, meal) => sum + safeNumber(meal.total_value), 0)

    return {
      labor,
      transport: workerTransport + transportOperations,
      meals: mealCost,
      other: 0,
    }
  }, [payments, meals, transports, currentMonth])

  const currentRevenue = useMemo(() => {
    return events
      .filter(
        (event) =>
          monthKey(event.start_date) === currentMonth &&
          event.status !== 'cancelled'
      )
      .reduce(
        (sum, event) => sum + safeNumber(event.contract_value),
        0
      )
  }, [events, currentMonth])

  const currentCosts =
    costBreakdown.labor +
    costBreakdown.transport +
    costBreakdown.meals +
    costBreakdown.other

  const currentProfit = currentRevenue - currentCosts

  const dayBuckets = useMemo(() => {
    const buckets = getDayBuckets(chartMonth)
    const map = new Map(buckets.map((bucket) => [bucket.key, bucket]))

    events.forEach((event) => {
      const bucket = map.get(event.start_date)

      if (!bucket || event.status === 'cancelled') return

      const value = safeNumber(event.contract_value)

      bucket.revenue += value
      bucket.cashIn += value
    })

    payments.forEach((payment) => {
      const bucket = map.get(payment.work_date)

      if (!bucket) return

      const cost =
        safeNumber(payment.daily_rate) +
        safeNumber(payment.transport_value) +
        safeNumber(payment.extra_value) -
        safeNumber(payment.discount_value)

      bucket.costs += cost

      if (payment.payment_status === 'paid') {
        bucket.cashOut += safeNumber(payment.total_value)
      }
    })

    meals.forEach((meal) => {
      const bucket = map.get(meal.meal_date)

      if (!bucket || meal.status === 'cancelled') return

      const value = safeNumber(meal.total_value)
      bucket.costs += value
      bucket.cashOut += value
    })

    transports.forEach((transport) => {
      const bucket = map.get(transport.transport_date)

      if (!bucket || transport.status === 'cancelled') return

      const value = safeNumber(transport.total_value)
      bucket.costs += value
      bucket.cashOut += value
    })

    advances.forEach((advance) => {
      const bucket = map.get(advance.advance_date)

      if (!bucket) return

      bucket.cashOut += safeNumber(advance.amount)
    })

    let accumulatedRevenue = 0
    let accumulatedCosts = 0

    buckets.forEach((bucket) => {
      accumulatedRevenue += bucket.revenue
      accumulatedCosts += bucket.costs
      bucket.revenue = accumulatedRevenue
      bucket.costs = accumulatedCosts
      bucket.profit = accumulatedRevenue - accumulatedCosts
    })

    return buckets
  }, [events, payments, meals, transports, advances, chartMonth])

  const chartMax = Math.max(
    ...dayBuckets.flatMap((bucket) => [
      bucket.revenue,
      bucket.costs,
      Math.max(bucket.profit, 0),
    ]),
    1
  )

  const revenueChartPoints = chartPoints(
    dayBuckets.map((bucket) => bucket.revenue),
    chartMax
  )

  const costChartPoints = chartPoints(
    dayBuckets.map((bucket) => bucket.costs),
    chartMax
  )

  const profitChartPoints = chartPoints(
    dayBuckets.map((bucket) => Math.max(bucket.profit, 0)),
    chartMax
  )

  const revenuePath = smoothLinePath(revenueChartPoints)
  const costPath = smoothLinePath(costChartPoints)
  const profitPath = smoothLinePath(profitChartPoints)
  const costAreaPath = areaPath(costChartPoints)
  const profitAreaPath = areaPath(profitChartPoints)

  const totalCostDistribution = currentCosts

  const costPercentages = {
    labor:
      totalCostDistribution > 0
        ? (costBreakdown.labor / totalCostDistribution) * 100
        : 0,
    transport:
      totalCostDistribution > 0
        ? (costBreakdown.transport / totalCostDistribution) * 100
        : 0,
    meals:
      totalCostDistribution > 0
        ? (costBreakdown.meals / totalCostDistribution) * 100
        : 0,
    other:
      totalCostDistribution > 0
        ? (costBreakdown.other / totalCostDistribution) * 100
        : 0,
  }

  const donutStyle = {
    background: `conic-gradient(
      #2563eb 0 ${costPercentages.labor}%,
      #7c3aed ${costPercentages.labor}% ${
        costPercentages.labor + costPercentages.transport
      }%,
      #f59e0b ${
        costPercentages.labor + costPercentages.transport
      }% ${
        costPercentages.labor +
        costPercentages.transport +
        costPercentages.meals
      }%,
      #22c55e ${
        costPercentages.labor +
        costPercentages.transport +
        costPercentages.meals
      }% 100%
    )`,
  }

  const maxCash = Math.max(
    ...dayBuckets.flatMap((bucket) => [
      bucket.cashIn,
      bucket.cashOut,
    ]),
    1
  )

  function eventProgress(event: EventItem) {
    const start = new Date(`${event.start_date}T00:00:00`).getTime()
    const end = new Date(`${event.end_date}T23:59:59`).getTime()
    const now = new Date().getTime()

    if (now <= start) return 0
    if (now >= end) return 100

    return Math.max(
      0,
      Math.min(100, ((now - start) / (end - start)) * 100)
    )
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar
        fullName={displayName}
        role={role}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-title-area">
            <button
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menu"
            >
              <Menu />
            </button>

            <div>
              <span className="eyebrow">VISÃO GERAL</span>
              <h1>Dashboard Principal</h1>
              <p>Visão geral completa da operação em tempo real</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alterar tema"
            >
              {dark ? <Sun /> : <Moon />}
            </button>

            <div className="header-user">
              <div className="avatar">
                {displayName?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              <div>
                <strong>{displayName}</strong>
                <span>{owner ? 'Administrador' : 'Operacional'}</span>
              </div>

              <ChevronDown />
            </div>

            <button className="logout-btn" onClick={logout}>
              <LogOut />
              Sair
            </button>
          </div>
        </header>

        <section className="summary-grid">
          {owner && (
            <article className="summary-card blue-card">
              <div>
                <span>FATURAMENTO DO MÊS</span>
                <strong>{loading ? '...' : formatMoney(currentRevenue)}</strong>
                <small>Contratos com início no mês atual</small>
              </div>
              <TrendingUp className="summary-icon" />
            </article>
          )}

          {owner && (
            <article className="summary-card green-card">
              <div>
                <span>LUCRO LÍQUIDO DO MÊS</span>
                <strong>{loading ? '...' : formatMoney(currentProfit)}</strong>
                <small
                  className={
                    currentProfit >= 0 ? 'positive' : 'negative'
                  }
                >
                  {currentRevenue > 0
                    ? `${((currentProfit / currentRevenue) * 100).toFixed(1)}% de margem`
                    : 'Sem faturamento no período'}
                </small>
              </div>
              <DollarSign className="summary-icon" />
            </article>
          )}

          <article className="summary-card orange-card">
            <div>
              <span>EVENTOS NA AGENDA</span>
              <strong>{loading ? '...' : operationalEvents.length}</strong>
              <small>
                {operationalEvents[0]
                  ? `Próximo: ${operationalEvents[0].name} • ${formatDate(operationalEvents[0].start_date)}`
                  : 'Nenhum evento programado'}
              </small>
            </div>
            <CalendarDays className="summary-icon" />
          </article>

          <article className="summary-card purple-card">
            <div>
              <span>EQUIPE ESCALADA HOJE</span>
              <strong>{loading ? '...' : activeWorkersToday}</strong>
              <small>
                {activeWorkersToday > 0
                  ? 'Escalados para hoje'
                  : 'Nenhum trabalhador escalado hoje'}
              </small>
            </div>
            <UsersRound className="summary-icon" />
          </article>
        </section>

        <section className="dashboard-grid">
          {owner && (
            <article className="dash-panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3>FATURAMENTO VS CUSTOS VS LUCRO POR DIA</h3>
                </div>
                <label className="dashboard-month-picker">
                  <span>Mês</span>
                  <input
                    type="month"
                    value={chartMonth}
                    onChange={(event) => {
                      if (event.target.value) setChartMonth(event.target.value)
                    }}
                    aria-label="Selecionar mês do gráfico"
                  />
                </label>
              </div>

              <div className="chart-legend">
                <span><i className="legend-blue" />Faturamento</span>
                <span><i className="legend-red" />Custos</span>
                <span><i className="legend-green" />Lucro</span>
              </div>

              <div className="line-chart">
                <div className="chart-grid-lines" />

                {dayBuckets.length > 0 && (
                  <svg
                    viewBox="0 0 700 230"
                    preserveAspectRatio="none"
                    className="chart-svg"
                  >
                    <defs>
                      <linearGradient id="cost-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.38" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="profit-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.42" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </linearGradient>
                      <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    <path
                      className="chart-area cost-area"
                      d={costAreaPath}
                      fill="url(#cost-area)"
                    />
                    <path
                      className="chart-area profit-area"
                      d={profitAreaPath}
                      fill="url(#profit-area)"
                    />
                    <path className="line revenue-line" d={revenuePath} />
                    <path
                      className="line cost-line"
                      d={costPath}
                      filter="url(#line-glow)"
                    />
                    <path
                      className="line profit-line"
                      d={profitPath}
                      filter="url(#line-glow)"
                    />
                  </svg>
                )}

                <div className="chart-dates chart-dates-daily">
                  {dayBuckets.map((bucket, index) => (
                    <span
                      className={
                        index === 0 ||
                        (index + 1) % 5 === 0 ||
                        index === dayBuckets.length - 1
                          ? 'visible'
                          : ''
                      }
                      key={bucket.key}
                    >
                      {bucket.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )}

          {owner && (
            <article className="dash-panel costs-panel">
              <div className="panel-header">
                <div>
                  <h3>DISTRIBUIÇÃO DE CUSTOS</h3>
                </div>
              </div>

              {totalCostDistribution <= 0 ? (
                <div className="dashboard-empty-chart">
                  <strong>Sem custos no período</strong>
                  <span>Pagamentos, transportes e marmitas aparecerão aqui.</span>
                </div>
              ) : (
                <div className="cost-content">
                  <div className="donut" style={donutStyle}>
                    <div className="donut-center">
                      <small>Total</small>
                      <strong>{formatCompactMoney(totalCostDistribution)}</strong>
                    </div>
                  </div>

                  <div className="cost-list">
                    <div>
                      <span><i className="cost-blue" />Mão de obra</span>
                      <strong>{costPercentages.labor.toFixed(0)}%</strong>
                    </div>
                    <div>
                      <span><i className="cost-purple" />Transporte</span>
                      <strong>{costPercentages.transport.toFixed(0)}%</strong>
                    </div>
                    <div>
                      <span><i className="cost-orange" />Marmitas</span>
                      <strong>{costPercentages.meals.toFixed(0)}%</strong>
                    </div>
                    <div>
                      <span><i className="cost-green" />Outros custos</span>
                      <strong>{costPercentages.other.toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </article>
          )}

          <article
            className={`dash-panel events-panel ${
              !owner ? 'full-width-panel' : ''
            }`}
          >
            <div className="panel-header">
              <div>
                <span className="panel-label">PRÓXIMOS COMPROMISSOS</span>
                <h3>AGENDA OPERACIONAL</h3>
              </div>

              <button
                type="button"
                className="period-btn dashboard-view-all"
                onClick={() => router.push('/eventos')}
                aria-label="Ver todos os eventos"
              >
                Ver todos
              </button>
            </div>

            <div className="event-table-wrapper">
              <table className="event-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Período</th>
                    <th>Trabalhadores</th>
                    <th>Status</th>
                    <th>% Conclusão</th>
                  </tr>
                </thead>

                <tbody>
                  {operationalEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="events-empty">
                          <strong>Nenhum evento na agenda</strong>
                          <span>Os próximos eventos aparecerão aqui automaticamente.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    operationalEvents.map((event) => {
                      const progress = eventProgress(event)
                      const eventIsToday =
                        event.start_date <= today && event.end_date >= today

                      return (
                        <tr key={event.id}>
                          <td><strong>{event.name}</strong></td>
                          <td>{getClientName(event)}</td>
                          <td>
                            {formatDate(event.start_date)} - {formatDate(event.end_date)}
                          </td>
                          <td>{event.workers_needed}</td>
                          <td>
                            <span className={`status ${eventIsToday ? 'running' : 'pending'}`}>
                              {eventIsToday ? 'Em andamento' : 'Programado'}
                            </span>
                          </td>
                          <td>
                            <div className="dashboard-progress-cell">
                              <div className="progress">
                                <span style={{ width: `${progress.toFixed(0)}%` }} />
                              </div>
                              <small>{progress.toFixed(0)}%</small>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {owner && (
            <article className="dash-panel cash-panel">
              <div className="panel-header">
                <div><h3>FLUXO DE CAIXA POR DIA</h3></div>
                <span className="cash-chart-month-label">
                  {new Intl.DateTimeFormat('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(`${chartMonth}-01T12:00:00`))}
                </span>
              </div>

              <div className="cash-legend">
                <span><i className="legend-green" />Recebimentos</span>
                <span><i className="legend-red" />Pagamentos</span>
              </div>

              <div className="cash-chart-real">
                <div
                  className="cash-bars"
                  style={{
                    gridTemplateColumns: `repeat(${dayBuckets.length}, minmax(5px, 1fr))`,
                  }}
                >
                  {dayBuckets.map((bucket) => (
                    <div className="cash-month cash-day" key={bucket.key}>
                      <div className="cash-bar-area">
                        <div
                          className="bar income"
                          title={`Recebimentos: ${formatMoney(bucket.cashIn)}`}
                          style={{ height: `${(bucket.cashIn / maxCash) * 100}%` }}
                        />
                        <div
                          className="bar expense"
                          title={`Pagamentos: ${formatMoney(bucket.cashOut)}`}
                          style={{ height: `${(bucket.cashOut / maxCash) * 100}%` }}
                        />
                      </div>
                      <span>{bucket.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  )
}
