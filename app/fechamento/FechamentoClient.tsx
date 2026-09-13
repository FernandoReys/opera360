'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  FileText,
  Printer,
  ReceiptText,
  UsersRound,
  WalletCards,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type FechamentoProps = { email: string; fullName: string; role: string }

type EventItem = {
  id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  contract_value: number
  meal_value: number
  clients: { name: string } | { name: string }[] | null
}

type PaymentItem = {
  id: string
  total_value: number | null
  transport_value: number | null
  payment_status: 'pending' | 'paid' | 'cancelled'
}

type ScheduleItem = { id: string; worker_id: string; work_date: string }
type AttendanceItem = { schedule_id: string; attendance_status: 'present' | 'absent' | 'pending' }

export default function FechamentoClient({ email, fullName, role }: FechamentoProps) {
  const searchParams = useSearchParams()
  const requestedEventId = searchParams.get('eventId')
  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [attendances, setAttendances] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [includeInvoice, setIncludeInvoice] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('id, name, location, start_date, end_date, contract_value, meal_value, clients ( name )')
        .eq('status', 'completed')
        .order('end_date', { ascending: false })

      if (error) alert(`Erro ao carregar eventos finalizados: ${error.message}`)

      const completedEvents = (data ?? []) as EventItem[]
      setEvents(completedEvents)
      setSelectedEventId((current) => current || (requestedEventId && completedEvents.some((event) => event.id === requestedEventId) ? requestedEventId : completedEvents[0]?.id ?? ''))
      setLoading(false)
    }

    void loadEvents()
  }, [requestedEventId])

  useEffect(() => {
    async function loadDetails() {
      if (!selectedEventId) {
        setPayments([])
        setSchedules([])
        setAttendances([])
        return
      }

      setLoadingDetails(true)
      const supabase = createClient()
      const [paymentsResponse, schedulesResponse] = await Promise.all([
        supabase
          .from('payments')
          .select('id, total_value, transport_value, payment_status')
          .eq('event_id', selectedEventId),
        supabase
          .from('schedules')
          .select('id, worker_id, work_date')
          .eq('event_id', selectedEventId),
      ])

      if (paymentsResponse.error) alert(`Erro ao carregar pagamentos: ${paymentsResponse.error.message}`)
      if (schedulesResponse.error) alert(`Erro ao carregar escalas: ${schedulesResponse.error.message}`)

      const currentSchedules = (schedulesResponse.data ?? []) as ScheduleItem[]
      setPayments((paymentsResponse.data ?? []) as PaymentItem[])
      setSchedules(currentSchedules)

      if (currentSchedules.length) {
        const { data, error } = await supabase
          .from('attendances')
          .select('schedule_id, attendance_status')
          .in('schedule_id', currentSchedules.map((schedule) => schedule.id))

        if (error) alert(`Erro ao carregar presenças: ${error.message}`)
        setAttendances((data ?? []) as AttendanceItem[])
      } else {
        setAttendances([])
      }

      setLoadingDetails(false)
    }

    void loadDetails()
  }, [selectedEventId])

  const event = events.find((item) => item.id === selectedEventId) ?? null

  function clientName(item: EventItem) {
    if (!item.clients) return 'Sem cliente'
    return Array.isArray(item.clients) ? item.clients[0]?.name ?? 'Sem cliente' : item.clients.name
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  function formatDate(value: string) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  const summary = useMemo(() => {
    const contractValue = Number(event?.contract_value || 0)
    const invoiceFee = includeInvoice ? contractValue * 0.07 : 0
    const workerPayments = payments
      .filter((payment) => payment.payment_status !== 'cancelled')
      .reduce((total, payment) => total + Number(payment.total_value || 0), 0)
    const transportIncluded = payments
      .filter((payment) => payment.payment_status !== 'cancelled')
      .reduce((total, payment) => total + Number(payment.transport_value || 0), 0)
    const mealEstimate = Number(event?.meal_value || 0) * schedules.length
    const totalCosts = invoiceFee + workerPayments + mealEstimate
    const attendance = attendances.reduce((total, item) => {
      total[item.attendance_status]++
      return total
    }, { present: 0, absent: 0, pending: 0 })

    return {
      contractValue,
      invoiceFee,
      workerPayments,
      transportIncluded,
      mealEstimate,
      totalCosts,
      profit: contractValue - totalCosts,
      workerDays: schedules.length,
      workers: new Set(schedules.map((schedule) => schedule.worker_id)).size,
      days: new Set(schedules.map((schedule) => schedule.work_date)).size,
      paid: payments.filter((payment) => payment.payment_status === 'paid').length,
      pendingPayments: payments.filter((payment) => payment.payment_status === 'pending').length,
      attendance,
    }
  }, [attendances, event, includeInvoice, payments, schedules])

  function escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  }

  function printClosure() {
    if (!event) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const lines = [
      ['Valor contratado', summary.contractValue],
      ['Nota fiscal (7%)', -summary.invoiceFee],
      ['Pagamentos da equipe', -summary.workerPayments],
      ['Marmitas previstas', -summary.mealEstimate],
      ['Lucro líquido', summary.profit],
    ].map(([label, value]) => `<tr><td>${label}</td><td>${formatMoney(Number(value))}</td></tr>`).join('')

    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Fechamento - ${escapeHtml(event.name)}</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:36px}header{border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px}.tag{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:1px}h1{margin:5px 0;font-size:27px}h2{font-size:17px;margin:25px 0 10px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{padding:12px;border:1px solid #dbe4ee;border-radius:9px}.box span{display:block;color:#667085;font-size:11px}.box strong{display:block;margin-top:6px;font-size:14px}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #e5e7eb;font-size:13px}td:last-child{text-align:right;font-weight:700}.profit td{background:#ecfdf3;color:#14532d}.footer{margin-top:30px;color:#667085;font-size:11px}</style></head><body><header><div class="tag">OPERA360 - FECHAMENTO DO EVENTO</div><h1>${escapeHtml(event.name)}</h1><p>${formatDate(event.start_date)} a ${formatDate(event.end_date)}</p></header><div class="grid"><div class="box"><span>Cliente</span><strong>${escapeHtml(clientName(event))}</strong></div><div class="box"><span>Local</span><strong>${escapeHtml(event.location || 'Não informado')}</strong></div><div class="box"><span>Equipe</span><strong>${summary.workers} trabalhador(es) • ${summary.workerDays} diária(s)</strong></div></div><h2>Resumo financeiro</h2><table><tbody>${lines.replace('<tr><td>Lucro líquido', '<tr class="profit"><td>Lucro líquido')}</tbody></table><h2>Operação</h2><div class="grid"><div class="box"><span>Presentes</span><strong>${summary.attendance.present}</strong></div><div class="box"><span>Faltas</span><strong>${summary.attendance.absent}</strong></div><div class="box"><span>Pagamentos pendentes</span><strong>${summary.pendingPayments}</strong></div></div><p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}.</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={fullName || email.split('@')[0]} role={role} />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><span className="eyebrow">FINANCEIRO</span><h1>Fechamento do evento</h1><p>Confira custo, nota fiscal e lucro de cada evento finalizado.</p></div>
        </header>

        <section className="closure-page-container">
          <div className="closure-toolbar">
            <label><span>Evento finalizado</span><select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>{events.length === 0 ? <option value="">Nenhum evento finalizado</option> : events.map((item) => <option value={item.id} key={item.id}>{item.name} — {formatDate(item.start_date)}</option>)}</select></label>
            <label className="closure-invoice-toggle"><input type="checkbox" checked={includeInvoice} onChange={(event) => setIncludeInvoice(event.target.checked)} /><span>Descontar nota fiscal de 7%</span></label>
            <button type="button" disabled={!event || loadingDetails} onClick={printClosure}><Printer /> Gerar PDF</button>
          </div>

          {loading || loadingDetails ? <div className="events-empty">Carregando fechamento...</div> : !event ? <div className="events-empty"><FileText /><strong>Nenhum evento finalizado</strong><span>Finalize um evento para gerar o fechamento.</span></div> : (
            <>
              <section className="closure-event-header">
                <div><span>EVENTO FINALIZADO</span><h2>{event.name}</h2><p>{clientName(event)} · {formatDate(event.start_date)} a {formatDate(event.end_date)}</p></div>
                <strong className={summary.profit >= 0 ? 'closure-profit-positive' : 'closure-profit-negative'}>{formatMoney(summary.profit)}<small>lucro líquido</small></strong>
              </section>

              <section className="closure-metrics">
                <article><WalletCards /><span>Contrato</span><strong>{formatMoney(summary.contractValue)}</strong></article>
                <article><ReceiptText /><span>Custo total</span><strong>{formatMoney(summary.totalCosts)}</strong></article>
                <article><UsersRound /><span>Equipe</span><strong>{summary.workers} pessoas</strong><small>{summary.workerDays} diária(s) em {summary.days} dia(s)</small></article>
                <article><CheckCircle2 /><span>Presenças</span><strong>{summary.attendance.present} presente(s)</strong><small>{summary.attendance.absent} falta(s) · {summary.attendance.pending} pendente(s)</small></article>
              </section>

              <section className="closure-grid">
                <article className="closure-card"><h3><BadgeDollarSign /> Composição financeira</h3><div className="closure-line"><span>Valor contratado</span><strong>{formatMoney(summary.contractValue)}</strong></div>{includeInvoice && <div className="closure-line closure-negative"><span>Nota fiscal (7%)</span><strong>- {formatMoney(summary.invoiceFee)}</strong></div>}<div className="closure-line closure-negative"><span>Pagamentos da equipe</span><strong>- {formatMoney(summary.workerPayments)}</strong></div><div className="closure-line closure-subline"><span>Transporte incluído nos pagamentos</span><strong>{formatMoney(summary.transportIncluded)}</strong></div><div className="closure-line closure-negative"><span>Marmitas previstas</span><strong>- {formatMoney(summary.mealEstimate)}</strong></div><div className="closure-line closure-total"><span>Lucro líquido</span><strong>{formatMoney(summary.profit)}</strong></div></article>
                <article className="closure-card"><h3><CalendarDays /> Controle operacional</h3><div className="closure-operation-grid"><div><span>Local</span><strong>{event.location || 'Não informado'}</strong></div><div><span>Pagamentos pagos</span><strong>{summary.paid}</strong></div><div><span>Pagamentos pendentes</span><strong>{summary.pendingPayments}</strong></div><div><span>Valor de marmita/dia</span><strong>{formatMoney(Number(event.meal_value || 0))}</strong></div></div><p className="closure-note">O transporte é exibido para consulta e já está incluído no valor dos pagamentos da equipe, evitando duplicação de custo.</p></article>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
