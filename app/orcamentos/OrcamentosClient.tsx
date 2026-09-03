'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calculator,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  FileText,
  LogOut,
  Moon,
  Plus,
  Printer,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type OrcamentosProps = {
  email: string
  fullName: string
  role: string
}

type ClientItem = {
  id: string
  name: string
}

const workerCategoryDefinitions = [
  { key: 'security', label: 'Segurança' },
  { key: 'cleaning', label: 'Limpeza' },
  { key: 'loaders', label: 'Carregadores' },
  { key: 'helpers', label: 'Ajudantes' },
] as const

type WorkerCategoryKey = (typeof workerCategoryDefinitions)[number]['key']

type WorkerCategoryInput = { quantity: string; dailyRate: string }

type SavedWorkerCategory = {
  key: WorkerCategoryKey
  label: string
  quantity: number
  dailyRate: number
  total: number
}

type QuoteItem = {
  id: string
  client_id: string | null
  event_id: string | null
  title: string
  event_name: string
  event_location: string | null
  start_date: string
  end_date: string
  workers_quantity: number
  days_quantity: number
  daily_rate: number
  transport_per_worker: number
  meal_per_worker: number
  other_costs: number
  sale_value: number
  labor_cost: number
  transport_cost: number
  meal_cost: number
  total_cost: number
  profit_value: number
  margin_percent: number
  invoice_fee_enabled: boolean
  invoice_fee_percent: number
  worker_categories: SavedWorkerCategory[] | null
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  notes: string | null
  created_at: string
  clients:
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

type QuoteForm = {
  clientId: string
  title: string
  eventName: string
  location: string
  startDate: string
  endDate: string
  workerCategories: Record<WorkerCategoryKey, WorkerCategoryInput>
  transport: string
  meal: string
  otherCosts: string
  saleValue: string
  invoiceFeeEnabled: boolean
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  notes: string
}

const emptyForm: QuoteForm = {
  clientId: '',
  title: '',
  eventName: '',
  location: '',
  startDate: '',
  endDate: '',
  workerCategories: {
    security: { quantity: '', dailyRate: '' },
    cleaning: { quantity: '', dailyRate: '' },
    loaders: { quantity: '', dailyRate: '' },
    helpers: { quantity: '', dailyRate: '' },
  },
  transport: '',
  meal: '20',
  otherCosts: '0',
  saleValue: '',
  invoiceFeeEnabled: false,
  status: 'draft',
  notes: '',
}

function getTodayForInput() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60000

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .split('T')[0]
}

export default function OrcamentosClient({
  email,
  fullName,
  role,
}: OrcamentosProps) {
  const router = useRouter()
  const today = getTodayForInput()

  const [dark, setDark] = useState(true)
  const [clients, setClients] = useState<ClientItem[]>([])
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creatingEventId, setCreatingEventId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<QuoteForm>(emptyForm)

  const displayName =
    fullName && fullName.trim() && fullName !== 'Usuário'
      ? fullName.trim()
      : email.split('@')[0]

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

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

  function formatMoney(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0))
  }

  function formatDate(date: string) {
    if (!date) return '-'
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  function clientName(item: QuoteItem) {
    if (!item.clients) return 'Sem cliente'

    if (Array.isArray(item.clients)) {
      return item.clients[0]?.name ?? 'Sem cliente'
    }

    return item.clients.name
  }

  function calculateDays(startDate: string, endDate: string) {
    if (!startDate || !endDate) return 0

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)

    const diff = Math.floor(
      (end.getTime() - start.getTime()) / 86400000
    )

    return Math.max(diff + 1, 1)
  }

  const preview = useMemo(() => {
    const days = calculateDays(form.startDate, form.endDate)
    const workerCategories = workerCategoryDefinitions.map((category) => {
      const input = form.workerCategories[category.key]
      const quantity = Number(input.quantity || 0)
      const dailyRate = Number(input.dailyRate || 0)

      return {
        key: category.key,
        label: category.label,
        quantity,
        dailyRate,
        total: quantity * days * dailyRate,
      }
    })
    const workers = workerCategories.reduce(
      (sum, category) => sum + category.quantity,
      0
    )
    const transport = Number(form.transport || 0)
    const meal = Number(form.meal || 0)
    const other = Number(form.otherCosts || 0)
    const sale = Number(form.saleValue || 0)

    const laborCost = workerCategories.reduce(
      (sum, category) => sum + category.total,
      0
    )
    const transportCost = workers * days * transport
    const mealCost = workers * days * meal
    const totalCost = laborCost + transportCost + mealCost + other
    const invoiceFeePercent = 7
    const invoiceFeeValue = form.invoiceFeeEnabled
      ? sale * (invoiceFeePercent / 100)
      : 0
    const netSaleValue = sale - invoiceFeeValue
    const profit = netSaleValue - totalCost
    const margin = netSaleValue > 0 ? (profit / netSaleValue) * 100 : 0

    return {
      days,
      workers,
      workerCategories,
      laborCost,
      transportCost,
      mealCost,
      totalCost,
      invoiceFeePercent,
      invoiceFeeValue,
      netSaleValue,
      profit,
      margin,
    }
  }, [form])

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
          .eq('entity_type', 'quotes')
          .maybeSingle()

      if (preferenceError) {
        console.error(
          'Erro ao carregar preferência visual de quotes:',
          preferenceError.message
        )
      } else {
        hiddenBefore = preference?.hidden_before ?? null
      }
    }

    let quotesQuery = supabase
      .from('quotes')
      .select(`
        id,
        client_id,
        event_id,
        title,
        event_name,
        event_location,
        start_date,
        end_date,
        workers_quantity,
        days_quantity,
        daily_rate,
        worker_categories,
        transport_per_worker,
        meal_per_worker,
        other_costs,
        sale_value,
        labor_cost,
        transport_cost,
        meal_cost,
        total_cost,
        profit_value,
        margin_percent,
        invoice_fee_enabled,
        invoice_fee_percent,
        status,
        notes,
        created_at,
        clients (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (hiddenBefore) {
      quotesQuery = quotesQuery.gt('created_at', hiddenBefore)
    }

    const [clientsResponse, quotesResponse] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name')
        .order('name'),

      quotesQuery,
    ])

    if (!clientsResponse.error) {
      setClients(clientsResponse.data ?? [])
    }

    if (quotesResponse.error) {
      console.error(
        'Erro ao carregar orçamentos:',
        quotesResponse.error.message
      )
      setQuotes([])
    } else {
      setQuotes((quotesResponse.data ?? []) as QuoteItem[])
    }

    setLoading(false)
  }

  function setField<K extends keyof QuoteForm>(
    field: K,
    value: QuoteForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openModal() {
    setForm(emptyForm)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setForm(emptyForm)
  }

  async function createEventFromQuote(item: QuoteItem) {
    if (item.event_id) {
      return item.event_id
    }

    if (!item.client_id) {
      throw new Error(
        'O orçamento precisa ter um cliente antes de gerar o evento.'
      )
    }

    setCreatingEventId(item.id)

    const supabase = createClient()

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Não foi possível identificar o usuário.')
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          client_id: item.client_id,
          name: item.event_name,
          location: item.event_location || null,
          start_date: item.start_date,
          end_date: item.end_date,
          start_time: null,
          end_time: null,
          workers_needed: Number(item.workers_quantity || 0),
          contract_value: Number(item.sale_value || 0),
          meal_value: Number(item.meal_per_worker || 20),
          status: 'scheduled',
          notes: item.notes
            ? `Criado a partir do orçamento "${item.title}". ${item.notes}`
            : `Criado a partir do orçamento "${item.title}".`,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (eventError) {
        throw new Error(eventError.message)
      }

      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          event_id: event.id,
          status: 'approved',
        })
        .eq('id', item.id)

      if (quoteError) {
        await supabase
          .from('events')
          .delete()
          .eq('id', event.id)

        throw new Error(quoteError.message)
      }

      return event.id as string
    } finally {
      setCreatingEventId(null)
    }
  }

  async function createQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.clientId) {
      alert('Selecione o cliente.')
      return
    }

    if (!form.title.trim()) {
      alert('Informe o título do orçamento.')
      return
    }

    if (!form.eventName.trim()) {
      alert('Informe o nome do evento.')
      return
    }

    if (!form.startDate || !form.endDate) {
      alert('Informe o período do evento.')
      return
    }

    if (preview.days <= 0) {
      alert('Período inválido.')
      return
    }

    if (form.startDate < today) {
      alert('A data inicial deve ser hoje ou uma data futura.')
      return
    }

    if (form.endDate < form.startDate) {
      alert('A data final não pode ser anterior à data inicial.')
      return
    }

    if (preview.workers <= 0) {
      alert('Informe ao menos um trabalhador em uma categoria.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const { data: createdQuote, error } = await supabase
      .from('quotes')
      .insert({
        client_id: form.clientId,
        title: form.title.trim(),
        event_name: form.eventName.trim(),
        event_location: form.location.trim() || null,
        start_date: form.startDate,
        end_date: form.endDate,
        workers_quantity: preview.workers,
        days_quantity: preview.days,
        daily_rate:
          preview.workers > 0 && preview.days > 0
            ? preview.laborCost / (preview.workers * preview.days)
            : 0,
        worker_categories: preview.workerCategories,
        transport_per_worker: Number(form.transport || 0),
        meal_per_worker: Number(form.meal || 0),
        other_costs: Number(form.otherCosts || 0),
        sale_value: Number(form.saleValue || 0),
        invoice_fee_enabled: form.invoiceFeeEnabled,
        invoice_fee_percent: preview.invoiceFeePercent,
        labor_cost: preview.laborCost,
        transport_cost: preview.transportCost,
        meal_cost: preview.mealCost,
        total_cost: preview.totalCost,
        profit_value: preview.profit,
        margin_percent: preview.margin,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      .select(`
        id,
        client_id,
        event_id,
        title,
        event_name,
        event_location,
        start_date,
        end_date,
        workers_quantity,
        days_quantity,
        daily_rate,
        worker_categories,
        transport_per_worker,
        meal_per_worker,
        other_costs,
        sale_value,
        labor_cost,
        transport_cost,
        meal_cost,
        total_cost,
        profit_value,
        margin_percent,
        invoice_fee_enabled,
        invoice_fee_percent,
        status,
        notes,
        created_at,
        clients (
          id,
          name
        )
      `)
      .single()

    if (error || !createdQuote) {
      setSaving(false)
      alert(
        `Erro ao salvar orçamento: ${
          error?.message ?? 'Orçamento não retornado.'
        }`
      )
      return
    }

    if (form.status === 'approved') {
      try {
        await createEventFromQuote(createdQuote as QuoteItem)
      } catch (eventError) {
        const message =
          eventError instanceof Error
            ? eventError.message
            : 'Erro desconhecido'

        await supabase
          .from('quotes')
          .update({ status: 'draft' })
          .eq('id', createdQuote.id)

        setSaving(false)
        alert(
          `O orçamento foi salvo, mas o evento não pôde ser criado: ${message}`
        )

        closeModal()
        await loadData()
        return
      }
    }

    setSaving(false)
    closeModal()
    await loadData()
  }

  async function updateStatus(
    item: QuoteItem,
    status: QuoteItem['status']
  ) {
    const supabase = createClient()

    if (status === 'approved' && !item.event_id) {
      try {
        await createEventFromQuote({
          ...item,
          status: 'approved',
        })

        alert('Orçamento aprovado e evento criado com sucesso.')
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Erro desconhecido'

        alert(`Não foi possível aprovar o orçamento: ${message}`)
        return
      }

      await loadData()
      return
    }

    const { error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', item.id)

    if (error) {
      alert(`Erro ao alterar status: ${error.message}`)
      return
    }

    await loadData()
  }

  async function deleteQuote(item: QuoteItem) {
    const ok = window.confirm(
      `Excluir o orçamento "${item.title}"?`
    )

    if (!ok) return

    setDeletingId(item.id)

    const supabase = createClient()

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', item.id)

    setDeletingId(null)

    if (error) {
      alert(`Erro ao excluir orçamento: ${error.message}`)
      return
    }

    await loadData()
  }

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase()

    return quotes.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.event_name.toLowerCase().includes(query) ||
        clientName(item).toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [quotes, search, statusFilter])

  const summary = useMemo(() => {
    const approved = quotes.filter(
      (item) => item.status === 'approved'
    )

    const pending = quotes.filter(
      (item) =>
        item.status === 'draft' ||
        item.status === 'sent'
    )

    const totalProfit = approved.reduce(
      (sum, item) => sum + Number(item.profit_value || 0),
      0
    )

    const best = [...quotes]
      .filter((item) => Number(item.profit_value) > 0)
      .sort(
        (a, b) =>
          Number(b.profit_value) - Number(a.profit_value)
      )[0]

    return {
      total: quotes.length,
      approved: approved.length,
      pending: pending.length,
      totalProfit,
      best,
    }
  }, [quotes])

  function statusLabel(status: QuoteItem['status']) {
    switch (status) {
      case 'draft':
        return 'Rascunho'
      case 'sent':
        return 'Enviado'
      case 'approved':
        return 'Aprovado'
      case 'rejected':
        return 'Recusado'
    }
  }

  function setWorkerCategoryField(
    category: WorkerCategoryKey,
    field: keyof WorkerCategoryInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      workerCategories: {
        ...current.workerCategories,
        [category]: {
          ...current.workerCategories[category],
          [field]: value,
        },
      },
    }))
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function printQuote(item: QuoteItem, version: 'client' | 'internal') {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir a visualização do PDF. Libere os pop-ups e tente novamente.')
      return
    }

    const saleValue = Number(item.sale_value || 0)
    const feePercent = Number(item.invoice_fee_percent || 7)
    const feeValue = item.invoice_fee_enabled
      ? saleValue * (feePercent / 100)
      : 0
    const netSaleValue = saleValue - feeValue
    const isInternal = version === 'internal'
    const client = escapeHtml(clientName(item))
    const title = escapeHtml(item.title)
    const eventName = escapeHtml(item.event_name)
    const location = item.event_location
      ? `<p><b>Local:</b> ${escapeHtml(item.event_location)}</p>`
      : ''
    const categoryRows = (item.worker_categories ?? [])
      .filter((category) => Number(category.quantity) > 0)
      .map(
        (category) =>
          `<tr><td>${escapeHtml(category.label)} - ${category.quantity} pessoa(s) x ${formatMoney(category.dailyRate)}/dia</td><td>${formatMoney(category.total)}</td></tr>`
      )
      .join('')
    const internalRows = isInternal
      ? `
        ${categoryRows}
        <tr><td>Mão de obra por categoria</td><td>${formatMoney(Number(item.labor_cost || 0))}</td></tr>
        <tr><td>Valor total do orçamento</td><td>${formatMoney(saleValue)}</td></tr>
        <tr><td>Nota fiscal ${item.invoice_fee_enabled ? `${feePercent}%` : '(não aplicada)'}</td><td>-${formatMoney(feeValue)}</td></tr>
        <tr><td>Receita líquida</td><td>${formatMoney(netSaleValue)}</td></tr>
        <tr><td>Custo total previsto</td><td>-${formatMoney(Number(item.total_cost || 0))}</td></tr>
        <tr class="result"><td>Lucro previsto</td><td>${formatMoney(Number(item.profit_value || 0))} (${Number(item.margin_percent || 0).toFixed(1)}%)</td></tr>`
      : `
        <tr class="result"><td>Valor total do orçamento</td><td>${formatMoney(saleValue)}</td></tr>`

    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR"><head><meta charset="utf-8" />
      <title>${isInternal ? 'Orçamento interno' : 'Orçamento para cliente'} - ${title}</title>
      <style>
        * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #17202a; margin: 0; padding: 42px; }
        .header { border-bottom: 3px solid #1f7a58; padding-bottom: 20px; margin-bottom: 28px; } h1 { margin: 0; font-size: 26px; } .tag { color: #1f7a58; font-weight: 700; font-size: 12px; letter-spacing: 1px; }
        h2 { margin: 26px 0 12px; font-size: 16px; } p { margin: 7px 0; line-height: 1.45; } table { width: 100%; border-collapse: collapse; margin-top: 12px; } td { padding: 13px 10px; border-bottom: 1px solid #e5e7eb; } td:last-child { text-align: right; font-weight: 700; } .result td { background: #eaf7f0; font-size: 17px; font-weight: 700; border-top: 2px solid #1f7a58; } .footer { margin-top: 42px; color: #667085; font-size: 12px; } @media print { body { padding: 24px; } }
      </style></head><body>
        <div class="header"><div class="tag">OPERA360 - GESTÃO OPERACIONAL</div><h1>${isInternal ? 'Orçamento interno' : 'Orçamento'}</h1></div>
        <h2>${title}</h2>
        <p><b>Cliente:</b> ${client}</p><p><b>Evento:</b> ${eventName}</p>${location}
        <p><b>Período:</b> ${formatDate(item.start_date)} a ${formatDate(item.end_date)}</p>
        <p><b>Equipe prevista:</b> ${item.workers_quantity} trabalhador(es) por ${item.days_quantity} dia(s)</p>
        <table><tbody>${internalRows}</tbody></table>
        ${item.notes ? `<h2>Observações</h2><p>${escapeHtml(item.notes)}</p>` : ''}
        <p class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}. ${isInternal ? 'Uso interno e confidencial.' : ''}</p>
      </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={displayName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">COMERCIAL</span>
            <h1>Orçamentos</h1>
            <p>
              Calcule custos, preço de venda, lucro e margem por evento.
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

            <button className="logout-btn" onClick={logout}>
              <LogOut />
              Sair
            </button>
          </div>
        </header>

        <section className="quote-summary">
          <article>
            <span>TOTAL DE ORÇAMENTOS</span>
            <strong>{summary.total}</strong>
          </article>

          <article>
            <span>PENDENTES</span>
            <strong className="attendance-orange">
              {summary.pending}
            </strong>
          </article>

          <article>
            <span>APROVADOS</span>
            <strong className="attendance-green">
              {summary.approved}
            </strong>
          </article>

          <article>
            <span>LUCRO DOS APROVADOS</span>
            <strong className="quote-profit">
              {formatMoney(summary.totalProfit)}
            </strong>
          </article>
        </section>

        {summary.best && (
          <section className="quote-best">
            <div>
              <span>MELHOR RESULTADO</span>
              <strong>{summary.best.event_name}</strong>
              <small>
                {clientName(summary.best)} · margem{' '}
                {Number(summary.best.margin_percent).toFixed(1)}%
              </small>
            </div>

            <div>
              <span>LUCRO PREVISTO</span>
              <strong>
                {formatMoney(summary.best.profit_value)}
              </strong>
            </div>
          </section>
        )}

        <section className="events-toolbar">
          <div className="events-search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar orçamento, evento ou cliente..."
            />
          </div>

          <div className="events-toolbar-actions">
            <div className="event-filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="draft">Rascunhos</option>
                <option value="sent">Enviados</option>
                <option value="approved">Aprovados</option>
                <option value="rejected">Recusados</option>
              </select>
              <ChevronDown />
            </div>

            <button
              className="new-event-btn"
              onClick={openModal}
            >
              <Plus />
              Novo orçamento
            </button>
          </div>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">
              Carregando orçamentos...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="events-empty">
              <FileText />
              <strong>Nenhum orçamento encontrado</strong>
              <span>
                Crie o primeiro orçamento para começar.
              </span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table quote-table">
                <thead>
                  <tr>
                    <th>Orçamento</th>
                    <th>Cliente</th>
                    <th>Evento</th>
                    <th>Período</th>
                    <th>Trabalhadores</th>
                    <th>Venda</th>
                    <th>Custo</th>
                    <th>Lucro</th>
                    <th>Margem</th>
                    <th>Status</th>
                    <th>PDF</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredQuotes.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                      </td>

                      <td>{clientName(item)}</td>

                      <td>
                        <strong>{item.event_name}</strong>
                      </td>

                      <td>
                        {formatDate(item.start_date)}
                        {' - '}
                        {formatDate(item.end_date)}
                      </td>

                      <td>{item.workers_quantity}</td>

                      <td>{formatMoney(item.sale_value)}</td>

                      <td>{formatMoney(item.total_cost)}</td>

                      <td>
                        <strong
                          className={
                            Number(item.profit_value) >= 0
                              ? 'quote-profit'
                              : 'quote-loss'
                          }
                        >
                          {formatMoney(item.profit_value)}
                        </strong>
                      </td>

                      <td>
                        {Number(item.margin_percent).toFixed(1)}%
                      </td>

                      <td>
                        <select
                          className={`quote-status quote-status-${item.status}`}
                          value={item.status}
                          onChange={(e) =>
                            updateStatus(
                              item,
                              e.target.value as QuoteItem['status']
                            )
                          }
                        >
                          <option value="draft">
                            {statusLabel('draft')}
                          </option>
                          <option value="sent">
                            {statusLabel('sent')}
                          </option>
                          <option value="approved">
                            {statusLabel('approved')}
                          </option>
                          <option value="rejected">
                            {statusLabel('rejected')}
                          </option>
                        </select>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="quote-create-event-btn"
                            onClick={() => printQuote(item, 'client')}
                            title="Gerar orçamento para o cliente"
                          >
                            <Printer />
                            Cliente
                          </button>
                          <button
                            type="button"
                            className="quote-create-event-btn"
                            onClick={() => printQuote(item, 'internal')}
                            title="Gerar orçamento interno com NF e lucro"
                          >
                            <Printer />
                            Interno
                          </button>
                        </div>
                      </td>

                      <td>
                        {item.event_id ? (
                          <span className="quote-event-created">
                            <CheckCircle2 />
                            Criado
                          </span>
                        ) : item.status === 'approved' ? (
                          <button
                            type="button"
                            className="quote-create-event-btn"
                            disabled={creatingEventId === item.id}
                            onClick={async () => {
                              try {
                                await createEventFromQuote(item)
                                alert('Evento criado com sucesso.')
                                await loadData()
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : 'Erro desconhecido'

                                alert(`Erro ao criar evento: ${message}`)
                              }
                            }}
                          >
                            <CalendarPlus />
                            {creatingEventId === item.id
                              ? 'Criando...'
                              : 'Criar evento'}
                          </button>
                        ) : (
                          <span className="quote-event-waiting">
                            Aguarda aprovação
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="quote-delete-btn"
                          disabled={deletingId === item.id}
                          onClick={() => deleteQuote(item)}
                          aria-label="Excluir orçamento"
                        >
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
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
            className="event-modal quote-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="event-modal-header">
              <div>
                <span className="eyebrow">COMERCIAL</span>
                <h2>Novo orçamento</h2>
                <p>
                  Preencha os custos e veja o lucro antes de enviar ao cliente.
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
              onSubmit={createQuote}
            >
              <div className="event-form-grid">
                <label className="event-field">
                  <span>Cliente *</span>
                  <select
                    value={form.clientId}
                    onChange={(e) =>
                      setField('clientId', e.target.value)
                    }
                    required
                  >
                    <option value="">Selecione</option>
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
                  <span>Título do orçamento *</span>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setField('title', e.target.value)
                    }
                    placeholder="Ex.: Orçamento Expo Agosto"
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Evento *</span>
                  <input
                    value={form.eventName}
                    onChange={(e) =>
                      setField('eventName', e.target.value)
                    }
                    placeholder="Nome do evento"
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Local</span>
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setField('location', e.target.value)
                    }
                    placeholder="Local do evento"
                  />
                </label>

                <label className="event-field">
                  <span>Data inicial *</span>
                  <input
                    type="date"
                    value={form.startDate}
                    min={today}
                    onChange={(e) =>
                      setField('startDate', e.target.value)
                    }
                    required
                  />
                </label>

                <label className="event-field">
                  <span>Data final *</span>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || today}
                    onChange={(e) =>
                      setField('endDate', e.target.value)
                    }
                    required
                  />
                </label>

                <div className="event-field event-field-wide quote-categories">
                  <span>Equipe por categoria *</span>
                  <div className="quote-categories-grid">
                    {workerCategoryDefinitions.map((category) => (
                      <div className="quote-category-card" key={category.key}>
                        <strong>{category.label}</strong>
                        <label>
                          Quantidade
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.workerCategories[category.key].quantity}
                            onChange={(e) =>
                              setWorkerCategoryField(
                                category.key,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label>
                          Diária por pessoa
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.workerCategories[category.key].dailyRate}
                            onChange={(e) =>
                              setWorkerCategoryField(
                                category.key,
                                'dailyRate',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="event-field">
                  <span>Transporte por trabalhador/dia</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.transport}
                    onChange={(e) =>
                      setField('transport', e.target.value)
                    }
                  />
                </label>

                <label className="event-field">
                  <span>Marmita por trabalhador/dia</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.meal}
                    onChange={(e) =>
                      setField('meal', e.target.value)
                    }
                  />
                </label>

                <label className="event-field">
                  <span>Outros custos</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.otherCosts}
                    onChange={(e) =>
                      setField('otherCosts', e.target.value)
                    }
                  />
                </label>

                <label className="event-field">
                  <span>Valor de venda ao cliente *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.saleValue}
                    onChange={(e) =>
                      setField('saleValue', e.target.value)
                    }
                    required
                  />
                </label>

                <div className="event-field">
                  <span>Nota fiscal</span>
                  <button
                    type="button"
                    aria-pressed={form.invoiceFeeEnabled}
                    onClick={() =>
                      setField(
                        'invoiceFeeEnabled',
                        !form.invoiceFeeEnabled
                      )
                    }
                    style={{
                      alignSelf: 'flex-start',
                      border: 0,
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontWeight: 700,
                      padding: '10px 14px',
                      background: form.invoiceFeeEnabled
                        ? '#dcfce7'
                        : '#e5e7eb',
                      color: form.invoiceFeeEnabled
                        ? '#166534'
                        : '#475467',
                    }}
                  >
                    {form.invoiceFeeEnabled
                      ? 'NF 7% ativada'
                      : 'Aplicar NF de 7%'}
                  </button>
                  <small>
                    {form.invoiceFeeEnabled
                      ? 'O imposto será descontado do lucro previsto.'
                      : 'Ative para simular o custo da nota fiscal.'}
                  </small>
                </div>

                <label className="event-field">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setField(
                        'status',
                        e.target.value as QuoteForm['status']
                      )
                    }
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviado</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Recusado</option>
                  </select>
                </label>

                <label className="event-field event-field-wide">
                  <span>Observações</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setField('notes', e.target.value)
                    }
                    placeholder="Informações adicionais..."
                  />
                </label>
              </div>

              <div className="quote-calculation">
                <div className="quote-calculation-title">
                  <Calculator />
                  <div>
                    <strong>Resultado previsto</strong>
                    <span>
                      {preview.days} dia(s) · {preview.workers} trabalhador(es)
                    </span>
                  </div>
                </div>

                <div className="quote-calculation-grid">
                  <div>
                    <span>Mão de obra</span>
                    <strong>{formatMoney(preview.laborCost)}</strong>
                  </div>

                  {preview.workerCategories
                    .filter((category) => category.quantity > 0)
                    .map((category) => (
                      <div key={category.key}>
                        <span>{category.label}</span>
                        <strong>{formatMoney(category.total)}</strong>
                      </div>
                    ))}

                  <div>
                    <span>Transporte</span>
                    <strong>{formatMoney(preview.transportCost)}</strong>
                  </div>

                  <div>
                    <span>Marmitas</span>
                    <strong>{formatMoney(preview.mealCost)}</strong>
                  </div>

                  <div>
                    <span>Outros custos</span>
                    <strong>
                      {formatMoney(Number(form.otherCosts || 0))}
                    </strong>
                  </div>

                  <div>
                    <span>Custo total</span>
                    <strong>{formatMoney(preview.totalCost)}</strong>
                  </div>

                  <div>
                    <span>Venda</span>
                    <strong>
                      {formatMoney(Number(form.saleValue || 0))}
                    </strong>
                  </div>

                  <div>
                    <span>Nota fiscal (7%)</span>
                    <strong>
                      {form.invoiceFeeEnabled
                        ? `-${formatMoney(preview.invoiceFeeValue)}`
                        : 'Não aplicada'}
                    </strong>
                  </div>

                  <div>
                    <span>Receita líquida</span>
                    <strong>{formatMoney(preview.netSaleValue)}</strong>
                  </div>

                  <div className="quote-result-profit">
                    <span>Lucro</span>
                    <strong
                      className={
                        preview.profit >= 0
                          ? 'quote-profit'
                          : 'quote-loss'
                      }
                    >
                      {formatMoney(preview.profit)}
                    </strong>
                  </div>

                  <div className="quote-result-margin">
                    <span>Margem</span>
                    <strong
                      className={
                        preview.margin >= 0
                          ? 'quote-profit'
                          : 'quote-loss'
                      }
                    >
                      {preview.margin.toFixed(1)}%
                    </strong>
                  </div>
                </div>
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
                  <CheckCircle2 />
                  {saving ? 'Salvando...' : 'Salvar orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
