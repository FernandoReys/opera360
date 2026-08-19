'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Moon,
  Sun,
  Bell,
  Search,
  CheckCircle2,
  Clock3,
  User,
  Calendar,
  BadgeDollarSign,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type PagamentosProps = {
  email: string
  fullName: string
  role: string
}

type PaymentRow = {
  attendance_id: string
  worker_id: string
  event_id: string
  work_date: string
  worker_name: string
  event_name: string
  daily_rate: number
  transport_value: number
  payment_id: string | null
  advance_value: number
  extra_value: number
  discount_value: number
  total_value: number
  payment_status: 'pending' | 'paid' | 'cancelled'
  payment_method: string | null
  paid_at: string | null
  advance_ids: string[]
}

type AdvanceItem = {
  id: string
  worker_id: string
  event_id: string | null
  amount: number
  settled: boolean
  payment_id: string | null
}

export default function PagamentosClient({
  email,
  fullName,
  role,
}: PagamentosProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    void loadPayments()
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

  function calculateTotal(row: {
    daily_rate: number
    transport_value: number
    advance_value: number
    extra_value: number
    discount_value: number
  }) {
    const total =
      Number(row.daily_rate || 0) +
      Number(row.transport_value || 0) +
      Number(row.extra_value || 0) -
      Number(row.advance_value || 0) -
      Number(row.discount_value || 0)

    return Math.max(total, 0)
  }

  async function loadPayments() {
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
          .eq('entity_type', 'payments')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de payments:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let attendancesQuery = supabase
      .from('attendances')
      .select(`
        id,
        schedule_id,
        attendance_status,
        schedules (
          id,
          worker_id,
          event_id,
          work_date,
          workers (
            id,
            full_name,
            daily_rate,
            transport_value
          ),
          events (
            id,
            name
          )
        )
      `)
      .eq('attendance_status', 'present')
      .order('created_at', { ascending: false })

    if (hiddenBefore) {
      attendancesQuery = attendancesQuery.gt('created_at', hiddenBefore)
    }

    const [
      attendancesResponse,
      paymentsResponse,
      advancesResponse,
    ] = await Promise.all([
      attendancesQuery,

      supabase
        .from('payments')
        .select(`
          id,
          attendance_id,
          worker_id,
          event_id,
          work_date,
          daily_rate,
          transport_value,
          advance_value,
          extra_value,
          discount_value,
          total_value,
          payment_status,
          payment_method,
          paid_at
        `),

      supabase
        .from('advances')
        .select(`
          id,
          worker_id,
          event_id,
          amount,
          settled,
          payment_id
        `),
    ])

    if (attendancesResponse.error) {
      console.error('Erro ao carregar presenças:', attendancesResponse.error.message)
      setRows([])
      setLoading(false)
      return
    }

    if (paymentsResponse.error) {
      console.error('Erro ao carregar pagamentos:', paymentsResponse.error.message)
    }

    if (advancesResponse.error) {
      console.error('Erro ao carregar adiantamentos:', advancesResponse.error.message)
    }

    const payments = paymentsResponse.data ?? []
    const advances = (advancesResponse.data ?? []) as AdvanceItem[]

    const paymentMap = new Map(
      payments.map((payment) => [payment.attendance_id, payment])
    )

    const normalized: PaymentRow[] = []

    for (const attendance of attendancesResponse.data ?? []) {
      const scheduleRaw = attendance.schedules
      const schedule = Array.isArray(scheduleRaw) ? scheduleRaw[0] : scheduleRaw
      if (!schedule) continue

      const workerRaw = schedule.workers
      const worker = Array.isArray(workerRaw) ? workerRaw[0] : workerRaw

      const eventRaw = schedule.events
      const event = Array.isArray(eventRaw) ? eventRaw[0] : eventRaw

      if (!worker || !event) continue

      const existing = paymentMap.get(attendance.id)
      const dailyRate = Number(worker.daily_rate ?? 0)
      const transport = Number(worker.transport_value ?? 0)

      const linkedAdvances = existing?.id
        ? advances.filter((advance) => advance.payment_id === existing.id)
        : []

      const linkedAdvanceValue = linkedAdvances.reduce(
        (sum, advance) => sum + Number(advance.amount || 0),
        0
      )

      const row: PaymentRow = {
        attendance_id: attendance.id,
        worker_id: worker.id,
        event_id: event.id,
        work_date: schedule.work_date,
        worker_name: worker.full_name,
        event_name: event.name,
        daily_rate: existing ? Number(existing.daily_rate) : dailyRate,
        transport_value: existing
          ? Number(existing.transport_value)
          : transport,
        payment_id: existing?.id ?? null,
        advance_value:
          linkedAdvanceValue > 0
            ? linkedAdvanceValue
            : existing
              ? Number(existing.advance_value)
              : 0,
        extra_value: existing ? Number(existing.extra_value) : 0,
        discount_value: existing ? Number(existing.discount_value) : 0,
        total_value: existing ? Number(existing.total_value) : dailyRate + transport,
        payment_status: existing?.payment_status ?? 'pending',
        payment_method: existing?.payment_method ?? null,
        paid_at: existing?.paid_at ?? null,
        advance_ids: linkedAdvances.map((advance) => advance.id),
      }

      normalized.push(row)
    }

    const availableAdvances = advances.filter(
      (advance) => !advance.settled && !advance.payment_id
    )

    const rowsByGroup = new Map<string, PaymentRow[]>()

    normalized.forEach((row) => {
      if (row.payment_status !== 'pending') return
      const key = `${row.worker_id}:${row.event_id}`
      const group = rowsByGroup.get(key) ?? []
      group.push(row)
      rowsByGroup.set(key, group)
    })

    rowsByGroup.forEach((groupRows, key) => {
      groupRows.sort((a, b) => a.work_date.localeCompare(b.work_date))

      const targetRow = groupRows.find((row) => row.advance_ids.length === 0)
      if (!targetRow) return

      const [workerId, eventId] = key.split(':')

      const matching = availableAdvances.filter(
        (advance) =>
          advance.worker_id === workerId &&
          (advance.event_id === eventId || advance.event_id === null)
      )

      if (matching.length === 0) return

      targetRow.advance_ids = matching.map((advance) => advance.id)
      targetRow.advance_value = matching.reduce(
        (sum, advance) => sum + Number(advance.amount || 0),
        0
      )
      targetRow.total_value = calculateTotal(targetRow)
    })

    setRows(normalized)
    setLoading(false)
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.worker_name.toLowerCase().includes(query) ||
        row.event_name.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : row.payment_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  const summary = useMemo(() => {
    const pending = rows.filter((row) => row.payment_status === 'pending')
    const paid = rows.filter((row) => row.payment_status === 'paid')

    return {
      total: rows.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      pendingValue: pending.reduce((sum, row) => sum + row.total_value, 0),
      paidValue: paid.reduce((sum, row) => sum + row.total_value, 0),
    }
  }, [rows])

  async function persistPayment(
    row: PaymentRow,
    changes?: Partial<PaymentRow>
  ) {
    const updated = { ...row, ...changes }
    const total = calculateTotal(updated)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('payments')
      .upsert(
        {
          attendance_id: row.attendance_id,
          worker_id: row.worker_id,
          event_id: row.event_id,
          work_date: row.work_date,
          daily_rate: Number(updated.daily_rate || 0),
          transport_value: Number(updated.transport_value || 0),
          advance_value: Number(updated.advance_value || 0),
          extra_value: Number(updated.extra_value || 0),
          discount_value: Number(updated.discount_value || 0),
          total_value: total,
          payment_status: updated.payment_status,
          payment_method: updated.payment_method || null,
          paid_at:
            updated.payment_status === 'paid'
              ? updated.paid_at ?? new Date().toISOString()
              : null,
        },
        { onConflict: 'attendance_id' }
      )
      .select('id')
      .single()

    if (error) throw error

    return {
      paymentId: data.id as string,
      updated,
    }
  }

  async function savePayment(
    row: PaymentRow,
    changes?: Partial<PaymentRow>
  ) {
    setSavingId(row.attendance_id)

    try {
      await persistPayment(row, changes)
      await loadPayments()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido'

      alert(`Erro ao salvar pagamento: ${message}`)
    } finally {
      setSavingId(null)
    }
  }

  async function markAsPaid(row: PaymentRow) {
    setSavingId(row.attendance_id)

    const supabase = createClient()

    try {
      const { paymentId } = await persistPayment(row, {
        payment_status: 'paid',
        payment_method: 'pix',
        paid_at: new Date().toISOString(),
      })

      if (row.advance_ids.length > 0) {
        const { error: advanceError } = await supabase
          .from('advances')
          .update({
            settled: true,
            payment_id: paymentId,
          })
          .in('id', row.advance_ids)

        if (advanceError) throw advanceError
      }

      await loadPayments()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido'

      alert(`Erro ao concluir pagamento: ${message}`)
    } finally {
      setSavingId(null)
    }
  }

  async function reopenPayment(row: PaymentRow) {
    setSavingId(row.attendance_id)

    const supabase = createClient()

    try {
      if (row.payment_id) {
        const { error: advanceError } = await supabase
          .from('advances')
          .update({
            settled: false,
            payment_id: null,
          })
          .eq('payment_id', row.payment_id)

        if (advanceError) throw advanceError
      }

      await persistPayment(row, {
        payment_status: 'pending',
        paid_at: null,
      })

      await loadPayments()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido'

      alert(`Erro ao reabrir pagamento: ${message}`)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={fullName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">FINANCEIRO</span>
            <h1>Pagamentos</h1>
            <p>Diária + transporte + extras − adiantamentos − descontos.</p>
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

            <button className="logout-btn" onClick={logout}>
              <LogOut />
              Sair
            </button>
          </div>
        </header>

        <section className="payment-summary">
          <article>
            <span>PAGAMENTOS GERADOS</span>
            <strong>{summary.total}</strong>
          </article>

          <article>
            <span>PENDENTES</span>
            <strong className="attendance-orange">
              {summary.pendingCount}
            </strong>
            <small>{formatMoney(summary.pendingValue)}</small>
          </article>

          <article>
            <span>PAGOS</span>
            <strong className="attendance-green">
              {summary.paidCount}
            </strong>
            <small>{formatMoney(summary.paidValue)}</small>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar trabalhador ou evento..."
            />
          </div>

          <div className="events-toolbar-actions">
            <div className="event-filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="paid">Pagos</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">Carregando pagamentos...</div>
          ) : filteredRows.length === 0 ? (
            <div className="events-empty">
              <BadgeDollarSign />
              <strong>Nenhum pagamento disponível</strong>
              <span>
                Os pagamentos aparecem quando o trabalhador é marcado como presente.
              </span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table payment-table">
                <thead>
                  <tr>
                    <th>Trabalhador</th>
                    <th>Evento</th>
                    <th>Data</th>
                    <th>Diária</th>
                    <th>Transporte</th>
                    <th>Adiantamento</th>
                    <th>Extra</th>
                    <th>Desconto</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => {
                    const saving = savingId === row.attendance_id

                    return (
                      <tr key={row.attendance_id}>
                        <td>
                          <div className="event-name-cell">
                            <div className="table-icon">
                              <User />
                            </div>
                            <div>
                              <strong>{row.worker_name}</strong>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="table-location">
                            <Calendar />
                            {row.event_name}
                          </div>
                        </td>

                        <td>{formatDate(row.work_date)}</td>
                        <td>{formatMoney(row.daily_rate)}</td>
                        <td>{formatMoney(row.transport_value)}</td>

                        <td>
                          <strong className="payment-advance-auto">
                            {formatMoney(row.advance_value)}
                          </strong>
                        </td>

                        <td>
                          <input
                            className="payment-money-input"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={row.extra_value}
                            onBlur={(e) =>
                              savePayment(row, {
                                extra_value: Number(e.target.value || 0),
                              })
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="payment-money-input"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={row.discount_value}
                            onBlur={(e) =>
                              savePayment(row, {
                                discount_value: Number(e.target.value || 0),
                              })
                            }
                          />
                        </td>

                        <td>
                          <strong className="payment-total">
                            {formatMoney(row.total_value)}
                          </strong>
                        </td>

                        <td>
                          {row.payment_status === 'paid' ? (
                            <span className="attendance-status attendance-present">
                              <CheckCircle2 />
                              Pago
                            </span>
                          ) : (
                            <span className="attendance-status attendance-pending">
                              <Clock3 />
                              Pendente
                            </span>
                          )}
                        </td>

                        <td>
                          {row.payment_status !== 'paid' ? (
                            <button
                              type="button"
                              className="payment-pay-btn"
                              disabled={saving}
                              onClick={() => markAsPaid(row)}
                            >
                              <CheckCircle2 />
                              {saving ? 'Salvando...' : 'Pagar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="payment-reopen-btn"
                              disabled={saving}
                              onClick={() => reopenPayment(row)}
                            >
                              Reabrir
                            </button>
                          )}
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
    </div>
  )
}