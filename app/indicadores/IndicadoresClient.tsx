'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  CheckCircle2,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  UsersRound,
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
  contract_value: number
  status: string
}

type AttendanceRow = {
  attendance_status: string
  created_at: string
}

type PaymentRow = {
  work_date: string
  total_value: number
  payment_status: string
}

type MealRow = {
  meal_date: string
  total_value: number
  status: string
}

type TransportRow = {
  transport_date: string
  total_value: number
  status: string
}

type WorkerRow = {
  id: string
  active: boolean
}

type MonthPoint = {
  key: string
  label: string
  revenue: number
  costs: number
  profit: number
}

function monthKey(value: string) {
  return value?.slice(0, 7) ?? ''
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function months(count = 6) {
  const now = new Date()
  const result: MonthPoint[] = []

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    result.push({
      key,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase(),
      revenue: 0,
      costs: 0,
      profit: 0,
    })
  }

  return result
}

function points(values: number[], width = 700, height = 220) {
  if (!values.length) return ''

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width

      const y =
        height -
        ((value - min) / range) * (height - 30) -
        15

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function IndicadoresClient({
  email,
  fullName,
  role,
}: Props) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<EventRow[]>([])
  const [attendances, setAttendances] = useState<AttendanceRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [meals, setMeals] = useState<MealRow[]>([])
  const [transports, setTransports] = useState<TransportRow[]>([])
  const [workers, setWorkers] = useState<WorkerRow[]>([])

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

    const [
      eventsResponse,
      attendanceResponse,
      paymentsResponse,
      mealsResponse,
      transportsResponse,
      workersResponse,
    ] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, start_date, contract_value, status'),

      supabase
        .from('attendances')
        .select('attendance_status, created_at'),

      supabase
        .from('payments')
        .select('work_date, total_value, payment_status'),

      supabase
        .from('meals')
        .select('meal_date, total_value, status'),

      supabase
        .from('transports')
        .select('transport_date, total_value, status'),

      supabase
        .from('workers')
        .select('id, active'),
    ])

    if (!eventsResponse.error) setEvents((eventsResponse.data ?? []) as EventRow[])
    if (!attendanceResponse.error) setAttendances((attendanceResponse.data ?? []) as AttendanceRow[])
    if (!paymentsResponse.error) setPayments((paymentsResponse.data ?? []) as PaymentRow[])
    if (!mealsResponse.error) setMeals((mealsResponse.data ?? []) as MealRow[])
    if (!transportsResponse.error) setTransports((transportsResponse.data ?? []) as TransportRow[])
    if (!workersResponse.error) setWorkers((workersResponse.data ?? []) as WorkerRow[])

    setLoading(false)
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  const metrics = useMemo(() => {
    const revenue = events
      .filter(
        (event) =>
          monthKey(event.start_date) === currentMonth &&
          event.status !== 'cancelled'
      )
      .reduce((sum, event) => sum + Number(event.contract_value || 0), 0)

    const paymentCosts = payments
      .filter((item) => monthKey(item.work_date) === currentMonth)
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const mealCosts = meals
      .filter(
        (item) =>
          monthKey(item.meal_date) === currentMonth &&
          item.status !== 'cancelled'
      )
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const transportCosts = transports
      .filter(
        (item) =>
          monthKey(item.transport_date) === currentMonth &&
          item.status !== 'cancelled'
      )
      .reduce((sum, item) => sum + Number(item.total_value || 0), 0)

    const costs = paymentCosts + mealCosts + transportCosts
    const profit = revenue - costs

    const present = attendances.filter(
      (item) => item.attendance_status === 'present'
    ).length

    const absent = attendances.filter(
      (item) => item.attendance_status === 'absent'
    ).length

    const attendanceBase = present + absent

    return {
      revenue,
      costs,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      activeWorkers: workers.filter((worker) => worker.active).length,
      attendanceRate:
        attendanceBase > 0 ? (present / attendanceBase) * 100 : 0,
    }
  }, [
    events,
    payments,
    meals,
    transports,
    attendances,
    workers,
    currentMonth,
  ])

  const series = useMemo(() => {
    const result = months(6)
    const map = new Map(result.map((item) => [item.key, item]))

    events.forEach((event) => {
      const bucket = map.get(monthKey(event.start_date))
      if (!bucket || event.status === 'cancelled') return
      bucket.revenue += Number(event.contract_value || 0)
    })

    payments.forEach((item) => {
      const bucket = map.get(monthKey(item.work_date))
      if (!bucket) return
      bucket.costs += Number(item.total_value || 0)
    })

    meals.forEach((item) => {
      const bucket = map.get(monthKey(item.meal_date))
      if (!bucket || item.status === 'cancelled') return
      bucket.costs += Number(item.total_value || 0)
    })

    transports.forEach((item) => {
      const bucket = map.get(monthKey(item.transport_date))
      if (!bucket || item.status === 'cancelled') return
      bucket.costs += Number(item.total_value || 0)
    })

    result.forEach((item) => {
      item.profit = item.revenue - item.costs
    })

    return result
  }, [events, payments, meals, transports])

  const revenuePoints = points(series.map((item) => item.revenue))
  const costPoints = points(series.map((item) => item.costs))
  const profitPoints = points(series.map((item) => item.profit))

  const topEvents = useMemo(() => {
    return [...events]
      .filter((event) => event.status !== 'cancelled')
      .sort(
        (a, b) =>
          Number(b.contract_value || 0) -
          Number(a.contract_value || 0)
      )
      .slice(0, 5)
  }, [events])

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={displayName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">ANÁLISE</span>
            <h1>Indicadores</h1>
            <p>KPIs para acompanhar desempenho, custos e operação.</p>
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

        <section className="indicator-summary">
          <article>
            <TrendingUp />
            <span>FATURAMENTO DO MÊS</span>
            <strong>{loading ? '...' : money(metrics.revenue)}</strong>
          </article>

          <article>
            <DollarSign />
            <span>LUCRO DO MÊS</span>
            <strong className={metrics.profit >= 0 ? 'report-profit' : 'report-cost'}>
              {loading ? '...' : money(metrics.profit)}
            </strong>
            <small>{metrics.margin.toFixed(1)}% de margem</small>
          </article>

          <article>
            <UsersRound />
            <span>TRABALHADORES ATIVOS</span>
            <strong>{loading ? '...' : metrics.activeWorkers}</strong>
          </article>

          <article>
            <CheckCircle2 />
            <span>TAXA DE PRESENÇA</span>
            <strong>{loading ? '...' : `${metrics.attendanceRate.toFixed(1)}%`}</strong>
          </article>
        </section>

        <section className="indicator-grid">
          <article className="dash-panel indicator-chart-panel">
            <div className="panel-header">
              <div>
                <h3>EVOLUÇÃO FINANCEIRA — 6 MESES</h3>
              </div>
            </div>

            <div className="chart-legend">
              <span><i className="legend-blue" />Faturamento</span>
              <span><i className="legend-red" />Custos</span>
              <span><i className="legend-green" />Lucro</span>
            </div>

            <div className="line-chart">
              <div className="chart-grid-lines" />
              <svg
                viewBox="0 0 700 230"
                preserveAspectRatio="none"
                className="chart-svg"
              >
                <polyline className="line revenue-line" points={revenuePoints} />
                <polyline className="line cost-line" points={costPoints} />
                <polyline className="line profit-line" points={profitPoints} />
              </svg>

              <div className="chart-dates">
                {series.map((item) => (
                  <span key={item.key}>{item.label}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="dash-panel">
            <div className="panel-header">
              <div>
                <h3>SAÚDE OPERACIONAL</h3>
              </div>
            </div>

            <div className="indicator-health">
              <div>
                <span>Margem do mês</span>
                <strong>{metrics.margin.toFixed(1)}%</strong>
                <div className="indicator-track">
                  <span
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, metrics.margin)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <span>Presença</span>
                <strong>{metrics.attendanceRate.toFixed(1)}%</strong>
                <div className="indicator-track">
                  <span
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, metrics.attendanceRate)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="indicator-health-total">
                <Activity />
                <div>
                  <span>Custos no mês</span>
                  <strong>{money(metrics.costs)}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="dash-panel indicator-top-events">
            <div className="panel-header">
              <div>
                <h3>TOP 5 EVENTOS POR CONTRATO</h3>
              </div>
            </div>

            {topEvents.length === 0 ? (
              <div className="events-empty">
                <strong>Nenhum evento cadastrado</strong>
              </div>
            ) : (
              <div className="indicator-ranking">
                {topEvents.map((event, index) => (
                  <div key={event.id}>
                    <span className="indicator-rank">{index + 1}</span>
                    <div>
                      <strong>{event.name}</strong>
                      <small>{event.status}</small>
                    </div>
                    <b>{money(event.contract_value)}</b>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}