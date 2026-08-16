'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  CalendarDays,
  UsersRound,
  UserRoundCheck,
  FileText,
  WalletCards,
  LogOut,
  Moon,
  Sun,
  Bell,
  TrendingUp,
  DollarSign,
  BriefcaseBusiness,
  UtensilsCrossed,
  Bus,
  Settings,
  ClipboardCheck,
  Search,
  Plus,
  X,
  Phone,
  Mail,
  User,
  Building2,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type ClientesProps = {
  email: string
  fullName: string
  role: string
}

type ClientItem = {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  contact_name: string | null
  notes: string | null
  active: boolean
}

export default function ClientesClient({
  email,
  fullName,
  role,
}: ClientesProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const [name, setName] = useState('')
  const [clientDocument, setClientDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [notes, setNotes] = useState('')

  const owner = role === 'owner'

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'

    void loadClients()
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

  async function loadClients() {
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        document,
        phone,
        email,
        contact_name,
        notes,
        active
      `)
      .order('name')

    if (error) {
      console.error('Erro ao carregar clientes:', error.message)
      setClients([])
    } else {
      setClients((data ?? []) as ClientItem[])
    }

    setLoading(false)
  }

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return clients
    }

    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(query) ||
        (client.contact_name ?? '').toLowerCase().includes(query) ||
        (client.phone ?? '').toLowerCase().includes(query) ||
        (client.email ?? '').toLowerCase().includes(query) ||
        (client.document ?? '').toLowerCase().includes(query)
      )
    })
  }, [clients, search])

  function resetForm() {
    setName('')
    setClientDocument('')
    setPhone('')
    setClientEmail('')
    setContactName('')
    setNotes('')
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  async function createNewClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!name.trim()) {
      alert('Informe o nome do cliente.')
      return
    }

    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase.from('clients').insert({
      name: name.trim(),
      document: clientDocument.trim() || null,
      phone: phone.trim() || null,
      email: clientEmail.trim() || null,
      contact_name: contactName.trim() || null,
      notes: notes.trim() || null,
      active: true,
    })

    setSaving(false)

    if (error) {
      alert(`Erro ao cadastrar cliente: ${error.message}`)
      return
    }

    closeModal()
    await loadClients()
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
            <span className="eyebrow">OPERAÇÃO</span>
            <h1>Clientes</h1>
            <p>Cadastre e organize os clientes da empresa.</p>
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

        <section className="client-summary">
          <article>
            <span>TOTAL DE CLIENTES</span>
            <strong>{clients.length}</strong>
          </article>

          <article>
            <span>CLIENTES ATIVOS</span>
            <strong className="event-green">
              {clients.filter((client) => client.active).length}
            </strong>
          </article>

          <article>
            <span>INATIVOS</span>
            <strong>
              {clients.filter((client) => !client.active).length}
            </strong>
          </article>
        </section>

        <section className="events-toolbar">
          <div className="events-search">
            <Search />

            <input
              type="text"
              placeholder="Buscar cliente, contato, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="new-event-btn"
            onClick={() => setModalOpen(true)}
          >
            <Plus />
            Novo cliente
          </button>
        </section>

        <section className="events-list-card">
          {loading ? (
            <div className="events-empty">Carregando clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="events-empty">
              <Building2 />
              <strong>Nenhum cliente encontrado</strong>
              <span>Cadastre o primeiro cliente para começar.</span>
            </div>
          ) : (
            <div className="events-table-scroll">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>Documento</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="event-name-cell">
                          <div className="table-icon">
                            <Building2 />
                          </div>

                          <div>
                            <strong>{client.name}</strong>
                            <span>{client.notes || 'Sem observações'}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="table-location">
                          <User />
                          {client.contact_name || '-'}
                        </div>
                      </td>

                      <td>
                        <div className="table-location">
                          <Phone />
                          {client.phone || '-'}
                        </div>
                      </td>

                      <td>
                        <div className="table-location">
                          <Mail />
                          {client.email || '-'}
                        </div>
                      </td>

                      <td>{client.document || '-'}</td>

                      <td>
                        <span
                          className={
                            client.active
                              ? 'event-status status-in_progress'
                              : 'event-status status-cancelled'
                          }
                        >
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
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
        <div className="event-modal-overlay" onMouseDown={closeModal}>
          <div
            className="event-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="event-modal-header">
              <div>
                <span className="eyebrow">NOVO CADASTRO</span>
                <h2>Novo cliente</h2>
                <p>Cadastre as informações principais do cliente.</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>

            <form className="event-form" onSubmit={createNewClient}>
              <div className="event-form-grid">
                <label className="event-field event-field-wide">
                  <span>Nome / Razão social *</span>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Empresa ABC"
                    required
                  />
                </label>

                <label className="event-field">
                  <span>CPF / CNPJ</span>

                  <input
                    value={clientDocument}
                    onChange={(e) => setClientDocument(e.target.value)}
                    placeholder="Documento"
                  />
                </label>

                <label className="event-field">
                  <span>Nome do contato</span>

                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Responsável pelo cliente"
                  />
                </label>

                <label className="event-field">
                  <span>Telefone</span>

                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </label>

                <label className="event-field">
                  <span>E-mail</span>

                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                </label>

                <label className="event-field event-field-wide">
                  <span>Observações</span>

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações importantes sobre o cliente..."
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
                  {saving ? 'Salvando...' : 'Cadastrar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
