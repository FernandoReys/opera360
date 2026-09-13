'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MapPin,
  Printer,
  UsersRound,
  XCircle,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type EventosDoDiaProps = { email: string; fullName: string; role: string }

type EventItem = {
  id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  workers_needed: number
  status: 'scheduled' | 'in_progress'
  clients: { name: string } | { name: string }[] | null
}

type DaySchedule = {
  id: string
  event_id: string
  worker_id: string
  workers: { full_name: string } | { full_name: string }[] | null
  attendances: {
    id: string
    attendance_status: 'present' | 'absent' | 'pending'
    check_in: string | null
    check_out: string | null
  } | {
    id: string
    attendance_status: 'present' | 'absent' | 'pending'
    check_in: string | null
    check_out: string | null
  }[] | null
}

function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export default function EventosDoDiaClient({ email, fullName, role }: EventosDoDiaProps) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const today = todayLocal()

  useEffect(() => {
    async function loadEvents() {
      const supabase = createClient()
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`id, name, location, start_date, end_date, start_time, end_time, workers_needed, status, clients ( name )`)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('start_time', { ascending: true })

      if (eventsError) alert(`Erro ao carregar eventos do dia: ${eventsError.message}`)

      const currentEvents = (eventsData ?? []) as EventItem[]
      setEvents(currentEvents)

      if (currentEvents.length) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('schedules')
          .select('id, event_id, worker_id, workers ( full_name ), attendances ( id, attendance_status, check_in, check_out )')
          .eq('work_date', today)
          .in('event_id', currentEvents.map((event) => event.id))

        if (schedulesError) alert(`Erro ao carregar a escala do dia: ${schedulesError.message}`)
        setSchedules((schedulesData ?? []) as DaySchedule[])
      } else {
        setSchedules([])
      }

      setLoading(false)
    }

    void loadEvents()
  }, [today])

  function clientName(event: EventItem) {
    if (!event.clients) return 'Sem cliente'
    return Array.isArray(event.clients) ? event.clients[0]?.name ?? 'Sem cliente' : event.clients.name
  }

  function workerName(schedule: DaySchedule) {
    if (!schedule.workers) return 'Trabalhador não identificado'
    return Array.isArray(schedule.workers) ? schedule.workers[0]?.full_name ?? 'Trabalhador não identificado' : schedule.workers.full_name
  }

  function attendanceStatus(
    schedule: DaySchedule
  ): 'present' | 'absent' | 'pending' {
    if (!schedule.attendances) return 'pending'
    const attendance = Array.isArray(schedule.attendances) ? schedule.attendances[0] : schedule.attendances
    return attendance?.attendance_status ?? 'pending'
  }

  function attendanceData(schedule: DaySchedule) {
    if (!schedule.attendances) return null
    return Array.isArray(schedule.attendances)
      ? schedule.attendances[0] ?? null
      : schedule.attendances
  }

  async function updateAttendance(
    schedule: DaySchedule,
    nextStatus: 'present' | 'absent' | 'pending',
    checkIn?: string,
    checkOut?: string
  ) {
    const current = attendanceData(schedule)
    setSavingId(schedule.id)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('attendances')
      .upsert({
        schedule_id: schedule.id,
        attendance_status: nextStatus,
        check_in: checkIn !== undefined ? checkIn || null : current?.check_in ?? null,
        check_out: checkOut !== undefined ? checkOut || null : current?.check_out ?? null,
      }, { onConflict: 'schedule_id' })
      .select('id, attendance_status, check_in, check_out')
      .single()

    setSavingId(null)

    if (error || !data) {
      alert(`Erro ao atualizar presença: ${error?.message ?? 'dados não retornados'}`)
      return
    }

    setSchedules((currentSchedules) => currentSchedules.map((item) =>
      item.id === schedule.id ? { ...item, attendances: data as DaySchedule['attendances'] } : item
    ))
  }

  function eventSchedules(eventId: string) {
    return schedules.filter((schedule) => schedule.event_id === eventId)
  }

  const attendanceSummary = useMemo(() => schedules.reduce(
    (summary, schedule) => {
      const status = attendanceStatus(schedule)
      summary[status]++
      return summary
    },
    { present: 0, absent: 0, pending: 0 }
  ), [schedules])

  const todayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`))

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function printDayReport() {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const eventsHtml = events.map((event) => {
      const team = eventSchedules(event.id)
      const summary = team.reduce((total, schedule) => {
        total[attendanceStatus(schedule)]++
        return total
      }, { present: 0, absent: 0, pending: 0 })
      const workers = team.length
        ? team.map((schedule) => `<li>${escapeHtml(workerName(schedule))} — ${attendanceStatus(schedule) === 'present' ? 'Presente' : attendanceStatus(schedule) === 'absent' ? 'Falta' : 'Pendente'}</li>`).join('')
        : '<li>Nenhuma pessoa escalada</li>'

      return `<section><h2>${escapeHtml(event.name)}</h2><p><strong>Cliente:</strong> ${escapeHtml(clientName(event))} &nbsp; | &nbsp; <strong>Local:</strong> ${escapeHtml(event.location || 'Não informado')} &nbsp; | &nbsp; <strong>Horário:</strong> ${event.start_time?.slice(0, 5) || '--:--'} - ${event.end_time?.slice(0, 5) || '--:--'}</p><div class="stats"><span>Escalados <b>${team.length}</b></span><span>Presentes <b>${summary.present}</b></span><span>Faltas <b>${summary.absent}</b></span><span>Pendentes <b>${summary.pending}</b></span></div><h3>Equipe</h3><ul>${workers}</ul></section>`
    }).join('') || '<p>Nenhum evento programado para hoje.</p>'

    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Eventos do dia - ${today}</title><style>body{font-family:Arial,sans-serif;color:#17202a;margin:36px}.tag{color:#2563eb;font-size:12px;font-weight:700;letter-spacing:1px}h1{margin:5px 0;font-size:27px}h2{margin:0 0 8px;font-size:18px}h3{font-size:13px;margin:16px 0 6px}header{border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:22px}section{border:1px solid #dbe4ee;border-radius:10px;margin:16px 0;padding:16px;background:#fbfdff}p,li{font-size:12px;line-height:1.55}.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.stats span{background:#eef5ff;border-radius:8px;padding:8px 10px;font-size:12px}.stats b{margin-left:5px}ul{columns:2;margin:0;padding-left:20px}.footer{margin-top:30px;color:#667085;font-size:11px}@media print{body{margin:20px}}</style></head><body><header><div class="tag">OPERA360 - OPERAÇÃO DO DIA</div><h1>Relatório de eventos do dia</h1><p>${escapeHtml(todayLabel)}</p></header><div class="stats"><span>Eventos <b>${events.length}</b></span><span>Escalados <b>${schedules.length}</b></span><span>Presentes <b>${attendanceSummary.present}</b></span><span>Faltas <b>${attendanceSummary.absent}</b></span><span>Pendentes <b>${attendanceSummary.pending}</b></span></div>${eventsHtml}<p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}.</p></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={fullName || email.split('@')[0]} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><span className="eyebrow">OPERAÇÃO DO DIA</span><h1>Eventos do dia</h1><p>{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p></div>
        </header>

        <section className="today-events-container">
          <div className="today-events-summary">
            <article><CalendarClock /><div><span>EVENTOS HOJE</span><strong>{events.length}</strong><small>Em operação ou programados</small></div></article>
            <article><UsersRound /><div><span>ESCALADOS HOJE</span><strong>{schedules.length}</strong><small>Pessoas na escala do dia</small></div></article>
            <article><CheckCircle2 /><div><span>PRESENTES</span><strong>{attendanceSummary.present}</strong><small>{attendanceSummary.pending} pendente(s) de confirmação</small></div></article>
          </div>

          <div className="today-events-list-heading">
            <div><span>AGENDA OPERACIONAL</span><h2>Eventos e acompanhamento de hoje</h2></div>
            <div className="today-events-heading-actions">
              <p>Confira a equipe escalada e o status de presença de cada evento.</p>
              <button type="button" className="today-day-pdf-btn" onClick={printDayReport}><Printer /> Gerar PDF do dia</button>
            </div>
          </div>

          <section className="today-events-grid">
            {loading ? <div className="events-empty">Carregando eventos do dia...</div> : events.length === 0 ? (
              <div className="events-empty"><CalendarClock /><strong>Nenhum evento para hoje</strong><span>Os eventos programados para hoje aparecerão aqui.</span></div>
            ) : events.map((event) => {
              const team = eventSchedules(event.id)
              const currentSummary = team.reduce((summary, schedule) => {
                summary[attendanceStatus(schedule)]++
                return summary
              }, { present: 0, absent: 0, pending: 0 })

              return (
                <article className="today-event-card" key={event.id}>
                  <div className="today-event-card-header">
                    <div className="table-icon"><CalendarClock /></div>
                    <div><span>EVENTO DE HOJE</span><h2>{event.name}</h2></div>
                    <strong>{event.status === 'in_progress' ? 'Em andamento' : 'Programado'}</strong>
                  </div>

                  <div className="today-event-info">
                    <div><Clock3 /><span>Horário</span><strong>{event.start_time?.slice(0, 5) || '--:--'} - {event.end_time?.slice(0, 5) || '--:--'}</strong></div>
                    <div><UsersRound /><span>Equipe</span><strong>{team.length} escalado(s)</strong></div>
                    <div><MapPin /><span>Local</span><strong>{event.location || 'Não informado'}</strong></div>
                    <div><span>Cliente</span><strong>{clientName(event)}</strong></div>
                  </div>

                  <section className="today-event-team">
                    <div className="today-section-title"><span>ESCALA DE HOJE</span><strong>{team.length} pessoa(s)</strong></div>
                    {team.length ? <div className="today-worker-list">{team.map((schedule) => <span key={schedule.id}>{workerName(schedule)}</span>)}</div> : <p>Nenhuma pessoa escalada para hoje.</p>}
                  </section>

                  <section className="today-attendance-panel">
                    <div className="today-section-title"><span>ACOMPANHAMENTO</span><strong>Presenças</strong></div>
                    <div className="today-attendance-stats">
                      <div className="attendance-present"><CheckCircle2 /><span>Presentes</span><strong>{currentSummary.present}</strong></div>
                      <div className="attendance-absent"><XCircle /><span>Faltas</span><strong>{currentSummary.absent}</strong></div>
                      <div className="attendance-pending"><Clock3 /><span>Pendentes</span><strong>{currentSummary.pending}</strong></div>
                    </div>
                  </section>

                  <section className="today-attendance-shortcut">
                    <div className="today-section-title"><span>ATALHO DE PRESENÇA</span><strong>Registrar no evento</strong></div>
                    {team.length ? (
                      <div className="today-attendance-list">
                        {team.map((schedule) => {
                          const attendance = attendanceData(schedule)
                          const currentStatus = attendanceStatus(schedule)
                          const saving = savingId === schedule.id

                          return (
                            <div className="today-attendance-row" key={schedule.id}>
                              <strong>{workerName(schedule)}</strong>
                              <label><span>Entrada</span><input type="time" value={attendance?.check_in?.slice(0, 5) ?? ''} onChange={(e) => void updateAttendance(schedule, currentStatus, e.target.value)} /></label>
                              <label><span>Saída</span><input type="time" value={attendance?.check_out?.slice(0, 5) ?? ''} onChange={(e) => void updateAttendance(schedule, currentStatus, undefined, e.target.value)} /></label>
                              <div className="today-attendance-actions">
                                <button type="button" className="today-present-btn" disabled={saving} onClick={() => void updateAttendance(schedule, 'present')} title="Marcar presença"><CheckCircle2 /></button>
                                <button type="button" className="today-absent-btn" disabled={saving} onClick={() => void updateAttendance(schedule, 'absent')} title="Marcar falta"><XCircle /></button>
                                <button type="button" className="today-pending-btn" disabled={saving} onClick={() => void updateAttendance(schedule, 'pending')} title="Voltar para pendente"><CircleHelp /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : <p className="today-shortcut-empty">Monte a escala deste evento para registrar as presenças aqui.</p>}
                  </section>

                </article>
              )
            })}
          </section>
        </section>
      </main>
    </div>
  )
}
