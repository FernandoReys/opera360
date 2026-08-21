'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  CalendarDays,
  ChevronDown,
  DollarSign,
  LogOut,
  Moon,
  PiggyBank,
  Sun,
  TrendingUp,
  WalletCards,
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
  contract_value: number
  status: string
  clients: { name: string } | { name: string }[] | null
}

type PaymentRow = {
  event_id: string | null
  work_date: string
  total_value: number
  payment_status: string
}

type MealRow = {
  event_id: string | null
  meal_date: string
  total_value: number
  status: string
}

type TransportRow = {
  event_id: string | null
  transport_date: string
  total_value: number
  status: string
}

type AdvanceRow = {
  event_id: string | null
  advance_date: string
  amount: number
  settled: boolean
}

type Period = 'month' | '3months' | '6months' | 'year'

type MonthPoint = {
  key: string
  label: string
  revenue: number
  costs: number
  profit: number
  cashOut: number
}

function n(value: unknown) {
  const valueNumber = Number(value ?? 0)
  return Number.isFinite(valueNumber) ? valueNumber : 0
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function monthKey(value: string) {
  return value?.slice(0, 7) ?? ''
}

function getClientName(event: EventRow) {
  if (!event.clients) return 'Sem cliente'
  if (Array.isArray(event.clients)) {
    return event.clients[0]?.name ?? 'Sem cliente'
  }
  return event.clients.name
}

function monthsFor(period: Period) {
  if (period === 'month') return 1
  if (period === '3months') return 3
  if (period === 'year') return 12
  return 6
}

function buildMonths(count: number) {
  const now = new Date()
  const items: MonthPoint[] = []

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    items.push({
      key,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase(),
      revenue: 0,
      costs: 0,
      profit: 0,
      cashOut: 0,
    })
  }

  return items
}

function linePoints(values: number[], maxValue: number, width = 700, height = 220) {
  if (!values.length) return ''
  const safeMax = Math.max(maxValue, 1)

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - (Math.max(0, value) / safeMax) * (height - 30) - 15
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function FinanceiroClient({ email, fullName, role }: Props) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('6months')

  const [events, setEvents] = useState<EventRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [meals, setMeals] = useState<MealRow[]>([])
  const [transports, setTransports] = useState<TransportRow[]>([])
  const [advances, setAdvances] = useState<AdvanceRow[]>([])

  const displayName =
    fullName && fullName.trim() && fullName !== 'Usuário'
      ? fullName.trim()
      : email.split('@')[0]

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
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

    const [eventsRes, paymentsRes, mealsRes, transportsRes, advancesRes] = await Promise.all([
      supabase
        .from('events')
        .select('id,name,start_date,end_date,contract_value,status,clients(name)')
        .order('start_date', { ascending: false }),
      supabase
        .from('payments')
        .select('event_id,work_date,total_value,payment_status'),
      supabase
        .from('meals')
        .select('event_id,meal_date,total_value,status'),
      supabase
        .from('transports')
        .select('event_id,transport_date,total_value,status'),
      supabase
        .from('advances')
        .select('event_id,advance_date,amount,settled'),
    ])

    if (!eventsRes.error) setEvents((eventsRes.data ?? []) as EventRow[])
    if (!paymentsRes.error) setPayments((paymentsRes.data ?? []) as PaymentRow[])
    if (!mealsRes.error) setMeals((mealsRes.data ?? []) as MealRow[])
    if (!transportsRes.error) setTransports((transportsRes.data ?? []) as TransportRow[])
    if (!advancesRes.error) setAdvances((advancesRes.data ?? []) as AdvanceRow[])

    setLoading(false)
  }

  const months = useMemo(() => {
    const result = buildMonths(monthsFor(period))
    const map = new Map(result.map((item) => [item.key, item]))

    events.forEach((event) => {
      const bucket = map.get(monthKey(event.start_date))
      if (!bucket || event.status === 'cancelled') return
      bucket.revenue += n(event.contract_value)
    })

    payments.forEach((payment) => {
      const bucket = map.get(monthKey(payment.work_date))
      if (!bucket) return
      const value = n(payment.total_value)
      bucket.costs += value
      if (payment.payment_status === 'paid') bucket.cashOut += value
    })

    meals.forEach((meal) => {
      const bucket = map.get(monthKey(meal.meal_date))
      if (!bucket || meal.status === 'cancelled') return
      const value = n(meal.total_value)
      bucket.costs += value
      bucket.cashOut += value
    })

    transports.forEach((transport) => {
      const bucket = map.get(monthKey(transport.transport_date))
      if (!bucket || transport.status === 'cancelled') return
      const value = n(transport.total_value)
      bucket.costs += value
      bucket.cashOut += value
    })

    advances.forEach((advance) => {
      const bucket = map.get(monthKey(advance.advance_date))
      if (!bucket) return
      bucket.cashOut += n(advance.amount)
    })

    result.forEach((item) => {
      item.profit = item.revenue - item.costs
    })

    return result
  }, [period, events, payments, meals, transports, advances])

  const currentKeys = useMemo(() => new Set(months.map((item) => item.key)), [months])

  const totals = useMemo(() => {
    const revenue = months.reduce((sum, item) => sum + item.revenue, 0)
    const costs = months.reduce((sum, item) => sum + item.costs, 0)
    const cashOut = months.reduce((sum, item) => sum + item.cashOut, 0)
    const profit = revenue - costs

    return {
      revenue,
      costs,
      cashOut,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    }
  }, [months])

  const paymentCost = payments
    .filter((item) => currentKeys.has(monthKey(item.work_date)))
    .reduce((sum, item) => sum + n(item.total_value), 0)

  const mealCost = meals
    .filter((item) => currentKeys.has(monthKey(item.meal_date)) && item.status !== 'cancelled')
    .reduce((sum, item) => sum + n(item.total_value), 0)

  const transportCost = transports
    .filter((item) => currentKeys.has(monthKey(item.transport_date)) && item.status !== 'cancelled')
    .reduce((sum, item) => sum + n(item.total_value), 0)

  const totalDistribution = paymentCost + mealCost + transportCost

  const paymentPct = totalDistribution > 0 ? (paymentCost / totalDistribution) * 100 : 0
  const transportPct = totalDistribution > 0 ? (transportCost / totalDistribution) * 100 : 0
  const mealPct = totalDistribution > 0 ? (mealCost / totalDistribution) * 100 : 0

  const donutStyle = {
    background: `conic-gradient(
      #2563eb 0 ${paymentPct}%,
      #7c3aed ${paymentPct}% ${paymentPct + transportPct}%,
      #f59e0b ${paymentPct + transportPct}% 100%
    )`,
  }

  const chartMax = Math.max(
    ...months.flatMap((item) => [item.revenue, item.costs, Math.max(item.profit, 0)]),
    1
  )

  const revenuePoints = linePoints(months.map((item) => item.revenue), chartMax)
  const costPoints = linePoints(months.map((item) => item.costs), chartMax)
  const profitPoints = linePoints(months.map((item) => Math.max(item.profit, 0)), chartMax)

  const eventResults = useMemo(() => {
    return events
      .filter((event) => currentKeys.has(monthKey(event.start_date)) && event.status !== 'cancelled')
      .map((event) => {
        const eventPayments = payments
          .filter((item) => item.event_id === event.id)
          .reduce((sum, item) => sum + n(item.total_value), 0)

        const eventMeals = meals
          .filter((item) => item.event_id === event.id && item.status !== 'cancelled')
          .reduce((sum, item) => sum + n(item.total_value), 0)

        const eventTransports = transports
          .filter((item) => item.event_id === event.id && item.status !== 'cancelled')
          .reduce((sum, item) => sum + n(item.total_value), 0)

        const revenue = n(event.contract_value)
        const cost = eventPayments + eventMeals + eventTransports
        const profit = revenue - cost

        return {
          ...event,
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        }
      })
      .sort((a, b) => b.profit - a.profit)
  }, [events, payments, meals, transports, currentKeys])

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={displayName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">FINANCEIRO</span>
            <h1>Visão Financeira</h1>
            <p>Acompanhe faturamento, custos, lucro e resultado dos eventos.</p>
          </div>

          <div className="dashboard-actions">
            <div className="finance-period">
              <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                <option value="month">Este mês</option>
                <option value="3months">3 meses</option>
                <option value="6months">6 meses</option>
                <option value="year">12 meses</option>
              </select>
              <ChevronDown />
            </div>

            <button className="icon-btn" onClick={toggleTheme} aria-label="Alterar tema">
              {dark ? <Sun /> : <Moon />}
            </button>

            <button className="logout-btn" onClick={logout}>
              <LogOut />
              Sair
            </button>
          </div>
        </header>

        <section className="finance-summary">
          <article className="finance-card finance-blue">
            <TrendingUp />
            <span>FATURAMENTO CONTRATADO</span>
            <strong>{loading ? '...' : money(totals.revenue)}</strong>
            <small>Valor dos contratos no período</small>
          </article>

          <article className="finance-card finance-red">
            <ArrowDownRight />
            <span>CUSTOS OPERACIONAIS</span>
            <strong>{loading ? '...' : money(totals.costs)}</strong>
            <small>Pagamentos + marmitas + transporte</small>
          </article>

          <article className="finance-card finance-green">
            <DollarSign />
            <span>LUCRO ESTIMADO</span>
            <strong>{loading ? '...' : money(totals.profit)}</strong>
            <small>{totals.margin.toFixed(1)}% de margem</small>
          </article>

          <article className="finance-card finance-purple">
            <WalletCards />
            <span>SAÍDAS DE CAIXA</span>
            <strong>{loading ? '...' : money(totals.cashOut)}</strong>
            <small>Pagos + adiantamentos + custos operacionais</small>
          </article>
        </section>

        <section className="finance-grid">
          <article className="dash-panel finance-chart-panel">
            <div className="panel-header">
              <div><h3>FATURAMENTO VS CUSTOS VS LUCRO</h3></div>
            </div>

            <div className="chart-legend">
              <span><i className="legend-blue" />Faturamento</span>
              <span><i className="legend-red" />Custos</span>
              <span><i className="legend-green" />Lucro</span>
            </div>

            <div className="line-chart">
              <div className="chart-grid-lines" />
              <svg viewBox="0 0 700 230" preserveAspectRatio="none" className="chart-svg">
                <polyline className="line revenue-line" points={revenuePoints} />
                <polyline className="line cost-line" points={costPoints} />
                <polyline className="line profit-line" points={profitPoints} />
              </svg>

              <div className="chart-dates">
                {months.map((item) => <span key={item.key}>{item.label}</span>)}
              </div>
            </div>
          </article>

          <article className="dash-panel finance-cost-panel">
            <div className="panel-header">
              <div><h3>DISTRIBUIÇÃO DE CUSTOS</h3></div>
            </div>

            {totalDistribution <= 0 ? (
              <div className="events-empty">
                <PiggyBank />
                <strong>Nenhum custo no período</strong>
              </div>
            ) : (
              <div className="finance-cost-content">
                <div className="donut" style={donutStyle}>
                  <div className="donut-center">
                    <small>Total</small>
                    <strong>{money(totalDistribution)}</strong>
                  </div>
                </div>

                <div className="cost-list">
                  <div><span><i className="cost-blue" />Pagamentos</span><strong>{paymentPct.toFixed(0)}%</strong></div>
                  <div><span><i className="cost-purple" />Transporte</span><strong>{transportPct.toFixed(0)}%</strong></div>
                  <div><span><i className="cost-orange" />Marmitas</span><strong>{mealPct.toFixed(0)}%</strong></div>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="events-list-card finance-events-card">
          <div className="panel-header">
            <div>
              <h3>RESULTADO POR EVENTO</h3>
              <span className="finance-table-subtitle">Receita, custos, lucro e margem por operação.</span>
            </div>
          </div>

          {loading ? (
            <div className="events-empty">Carregando financeiro...</div>
          ) : eventResults.length === 0 ? (
            <div className="events-empty">
              <CalendarDays />
              <strong>Nenhum evento no período</strong>
              <span>Os resultados aparecerão conforme os eventos forem cadastrados.</span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table finance-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Faturamento</th>
                    <th>Custos</th>
                    <th>Lucro</th>
                    <th>Margem</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eventResults.map((event) => (
                    <tr key={event.id}>
                      <td><strong>{event.name}</strong></td>
                      <td>{getClientName(event)}</td>
                      <td>{money(event.revenue)}</td>
                      <td className="finance-negative">{money(event.cost)}</td>
                      <td className={event.profit >= 0 ? 'finance-positive' : 'finance-negative'}>{money(event.profit)}</td>
                      <td>
                        <span className={event.margin >= 0 ? 'finance-margin-positive' : 'finance-margin-negative'}>
                          {event.margin.toFixed(1)}%
                        </span>
                      </td>
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