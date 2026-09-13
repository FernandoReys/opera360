'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Clock3,
  Database,
  EyeOff,
  History,
  ImageUp,
  LogOut,
  Moon,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Sun,
  UserRound,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type ConfiguracoesProps = {
  email: string
  fullName: string
  role: string
}

type ActivityLog = {
  id: string
  actor_name: string | null
  action: 'insert' | 'update' | 'delete'
  entity_type: string
  entity_id: string | null
  description: string | null
  created_at: string
}

type HistoryViewPreference = {
  entity_type: string
  hidden_before: string
}

type Tab = 'perfil' | 'historico' | 'dados'

const ENTITY_LABELS: Record<string, string> = {
  clients: 'Clientes',
  events: 'Eventos',
  workers: 'Trabalhadores',
  schedules: 'Escalas',
  attendances: 'Presenças',
  payments: 'Pagamentos',
  advances: 'Adiantamentos',
  meals: 'Marmitas',
  transports: 'Transporte',
  quotes: 'Orçamentos',
}

const ACTION_LABELS: Record<ActivityLog['action'], string> = {
  insert: 'Criado',
  update: 'Alterado',
  delete: 'Excluído',
}

const HISTORY_MODULES = [
  { key: 'clients', label: 'Clientes' },
  { key: 'events', label: 'Eventos' },
  { key: 'schedules', label: 'Escalas' },
  { key: 'workers', label: 'Trabalhadores' },
  { key: 'attendances', label: 'Presenças' },
  { key: 'payments', label: 'Pagamentos' },
  { key: 'advances', label: 'Adiantamentos' },
  { key: 'meals', label: 'Marmitas' },
  { key: 'transports', label: 'Transporte' },
  { key: 'quotes', label: 'Orçamentos' },
] as const

export default function ConfiguracoesClient({
  email,
  fullName,
  role,
}: ConfiguracoesProps) {
  const router = useRouter()
  const owner = role === 'owner'

  const [dark, setDark] = useState(true)
  const [tab, setTab] = useState<Tab>('perfil')

  const [name, setName] = useState(fullName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [historyPreferences, setHistoryPreferences] = useState<HistoryViewPreference[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [cleaningHistory, setCleaningHistory] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  const [clearMode, setClearMode] = useState<'operations' | 'all' | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    window.document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  }, [])

  useEffect(() => {
    async function loadAvatar() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      setAvatarUrl(data?.avatar_url ?? null)
    }

    void loadAvatar()
  }, [])

  useEffect(() => {
    if (tab === 'historico') {
      void loadHistory()
    }
  }, [tab])

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

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const cleanName = name.trim()

    if (cleanName.length < 2) {
      alert('Informe um nome válido.')
      return
    }

    setSavingProfile(true)

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setSavingProfile(false)
      alert('Não foi possível identificar o usuário.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: cleanName,
      })
      .eq('id', user.id)

    setSavingProfile(false)

    if (error) {
      alert(`Erro ao atualizar perfil: ${error.message}`)
      return
    }

    alert('Nome atualizado com sucesso.')
    router.refresh()
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Escolha um arquivo de imagem.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A foto deve ter no máximo 2 MB.')
      return
    }

    setUploadingAvatar(true)

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setUploadingAvatar(false)
      alert('Não foi possível identificar o usuário.')
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      setUploadingAvatar(false)
      alert(`Erro ao enviar foto: ${uploadError.message}`)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('profile-photos').getPublicUrl(path)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    setUploadingAvatar(false)

    if (profileError) {
      alert(`A foto foi enviada, mas não foi possível salvar o perfil: ${profileError.message}`)
      return
    }

    setAvatarUrl(`${publicUrl}?v=${Date.now()}`)
    router.refresh()
  }

  async function loadHistory() {
    setLoadingLogs(true)

    const supabase = createClient()

    const [logsResponse, preferencesResponse] = await Promise.all([
      supabase
        .from('activity_logs')
        .select(`
          id,
          actor_name,
          action,
          entity_type,
          entity_id,
          description,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(500),

      supabase
        .from('history_view_preferences')
        .select('entity_type, hidden_before'),
    ])

    setLoadingLogs(false)

    if (logsResponse.error) {
      console.error('Erro ao carregar histórico:', logsResponse.error.message)
      setLogs([])
    } else {
      setLogs((logsResponse.data ?? []) as ActivityLog[])
    }

    if (preferencesResponse.error) {
      console.error(
        'Erro ao carregar preferências do histórico:',
        preferencesResponse.error.message
      )
      setHistoryPreferences([])
    } else {
      setHistoryPreferences(
        (preferencesResponse.data ?? []) as HistoryViewPreference[]
      )
    }
  }

  async function clearHistoryView(entityType: string) {
    const label =
      entityType === '*'
        ? 'todo o histórico da tela'
        : `o histórico de ${ENTITY_LABELS[entityType] ?? entityType}`

    const ok = window.confirm(
      `Limpar ${label}? Os registros NÃO serão apagados do banco. Eles apenas deixarão de aparecer para você nesta tela.`
    )

    if (!ok) return

    setCleaningHistory(entityType)

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setCleaningHistory(null)
      alert('Não foi possível identificar o usuário.')
      return
    }

    const hiddenBefore = new Date().toISOString()

    const { error: historyError } = await supabase
      .from('history_view_preferences')
      .upsert(
        {
          user_id: user.id,
          entity_type: entityType,
          hidden_before: hiddenBefore,
        },
        {
          onConflict: 'user_id,entity_type',
        }
      )

    if (historyError) {
      setCleaningHistory(null)
      alert(`Erro ao limpar o histórico: ${historyError.message}`)
      return
    }

    const moduleTypes =
      entityType === '*'
        ? HISTORY_MODULES.map((item) => item.key)
        : [entityType]

    const { error: moduleError } = await supabase
      .from('module_view_preferences')
      .upsert(
        moduleTypes.map((moduleType) => ({
          user_id: user.id,
          entity_type: moduleType,
          hidden_before: hiddenBefore,
        })),
        {
          onConflict: 'user_id,entity_type',
        }
      )

    setCleaningHistory(null)

    if (moduleError) {
      alert(
        `O histórico foi limpo, mas houve erro ao limpar a página: ${moduleError.message}`
      )
      return
    }

    await loadHistory()
  }

  async function restoreHistoryView(entityType?: string) {
    const label = entityType
      ? ENTITY_LABELS[entityType] ?? entityType
      : 'todos os módulos'

    const ok = window.confirm(
      `Restaurar o histórico oculto de ${label}?`
    )

    if (!ok) return

    setCleaningHistory(entityType ?? 'restore-all')

    const supabase = createClient()

    let query = supabase
      .from('history_view_preferences')
      .delete()

    if (entityType) {
      query = query.eq('entity_type', entityType)
    } else {
      query = query.in(
        'entity_type',
        ['*', ...HISTORY_MODULES.map((item) => item.key)]
      )
    }

    const { error } = await query

    if (error) {
      setCleaningHistory(null)
      alert(`Erro ao restaurar histórico: ${error.message}`)
      return
    }

    let moduleQuery = supabase
      .from('module_view_preferences')
      .delete()

    if (entityType) {
      moduleQuery = moduleQuery.eq('entity_type', entityType)
    } else {
      moduleQuery = moduleQuery.in(
        'entity_type',
        HISTORY_MODULES.map((item) => item.key)
      )
    }

    const { error: moduleError } = await moduleQuery

    setCleaningHistory(null)

    if (moduleError) {
      alert(
        `O histórico foi restaurado, mas houve erro ao restaurar a página: ${moduleError.message}`
      )
      return
    }

    await loadHistory()
  }

  const filteredLogs = useMemo(() => {
    const query = historySearch.trim().toLowerCase()

    const globalHiddenBefore =
      historyPreferences.find((item) => item.entity_type === '*')
        ?.hidden_before ?? null

    return logs.filter((item) => {
      const entityHiddenBefore =
        historyPreferences.find(
          (preference) => preference.entity_type === item.entity_type
        )?.hidden_before ?? null

      const hiddenBefore = [globalHiddenBefore, entityHiddenBefore]
        .filter(Boolean)
        .sort()
        .at(-1)

      if (
        hiddenBefore &&
        new Date(item.created_at).getTime() <=
          new Date(hiddenBefore).getTime()
      ) {
        return false
      }

      const entityLabel =
        ENTITY_LABELS[item.entity_type] ?? item.entity_type

      const matchesEntity =
        entityFilter === 'all' || item.entity_type === entityFilter

      const matchesSearch =
        !query ||
        (item.actor_name ?? '').toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query) ||
        entityLabel.toLowerCase().includes(query) ||
        ACTION_LABELS[item.action].toLowerCase().includes(query)

      return matchesEntity && matchesSearch
    })
  }, [
    logs,
    historyPreferences,
    historySearch,
    entityFilter,
  ])

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  function openClear(mode: 'operations' | 'all') {
    setClearMode(mode)
    setConfirmation('')
  }

  function closeClear() {
    if (clearing) return
    setClearMode(null)
    setConfirmation('')
  }

  async function executeClear() {
    if (!owner || !clearMode) return

    const expected =
      clearMode === 'operations'
        ? 'LIMPAR OPERACAO'
        : 'LIMPAR TUDO'

    if (confirmation.trim().toUpperCase() !== expected) {
      alert(`Digite exatamente: ${expected}`)
      return
    }

    setClearing(true)

    const supabase = createClient()

    const functionName =
      clearMode === 'operations'
        ? 'clear_operational_data'
        : 'clear_business_data'

    const { error } = await supabase.rpc(functionName)

    setClearing(false)

    if (error) {
      alert(`Erro ao limpar dados: ${error.message}`)
      return
    }

    alert(
      clearMode === 'operations'
        ? 'Dados operacionais removidos com sucesso.'
        : 'Dados empresariais removidos com sucesso.'
    )

    closeClear()
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar fullName={fullName} role={role} />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">ADMINISTRAÇÃO</span>
            <h1>Configurações</h1>
            <p>
              Gerencie seu perfil, consulte o histórico e administre os dados.
            </p>
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

        <section className="settings-tabs">
          <button
            className={tab === 'perfil' ? 'active' : ''}
            onClick={() => setTab('perfil')}
          >
            <UserRound />
            Perfil
          </button>

          <button
            className={tab === 'historico' ? 'active' : ''}
            onClick={() => setTab('historico')}
          >
            <History />
            Histórico
          </button>

          {owner && (
            <button
              className={tab === 'dados' ? 'active danger-tab' : 'danger-tab'}
              onClick={() => setTab('dados')}
            >
              <Database />
              Dados do sistema
            </button>
          )}
        </section>

        {tab === 'perfil' && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-icon">
                <UserRound />
              </div>

              <div>
                <h2>Meu perfil</h2>
                <p>Atualize o nome exibido no sistema.</p>
              </div>
            </div>

            <form className="settings-form" onSubmit={saveProfile}>
              <div className="profile-avatar-editor">
                <div className="profile-avatar-preview">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto do perfil" />
                  ) : (
                    name.trim().charAt(0).toUpperCase() || 'U'
                  )}
                </div>

                <div>
                  <strong>Foto do perfil</strong>
                  <p>Use uma imagem quadrada de até 2 MB para facilitar a identificação da equipe.</p>
                  <label className="profile-avatar-upload">
                    <ImageUp />
                    {uploadingAvatar ? 'Enviando...' : 'Escolher foto'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      onChange={(event) => {
                        void uploadAvatar(event.target.files?.[0] ?? null)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              <label>
                <span>Nome completo</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </label>

              <label>
                <span>E-mail</span>
                <input value={email} disabled />
              </label>

              <label>
                <span>Nível de acesso</span>
                <input
                  value={owner ? 'Administrador' : 'Operacional'}
                  disabled
                />
              </label>

              <div className="settings-form-actions">
                <button type="submit" disabled={savingProfile}>
                  <Save />
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === 'historico' && (
          <section className="settings-card history-card">
            <div className="settings-card-header">
              <div className="settings-icon">
                <History />
              </div>

              <div>
                <h2>Histórico do sistema</h2>
                <p>
                  Acompanhe criações, alterações e exclusões registradas.
                </p>
              </div>
            </div>

            <div className="history-toolbar">
              <div className="history-search">
                <Search />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar no histórico..."
                />
              </div>

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="all">Todos os módulos</option>
                <option value="events">Eventos</option>
                <option value="workers">Trabalhadores</option>
                <option value="clients">Clientes</option>
                <option value="schedules">Escalas</option>
                <option value="attendances">Presenças</option>
                <option value="payments">Pagamentos</option>
                <option value="advances">Adiantamentos</option>
                <option value="meals">Marmitas</option>
                <option value="transports">Transporte</option>
                <option value="quotes">Orçamentos</option>
              </select>
            </div>

            <div className="history-clean-panel">
              <div className="history-clean-header">
                <div>
                  <strong>Limpar visualização do histórico</strong>
                  <span>
                    Isso não apaga nenhum dado nem o histórico do banco.
                    Apenas oculta registros antigos desta tela para o usuário atual.
                    Novas movimentações continuam aparecendo normalmente.
                  </span>
                </div>

                <div className="history-clean-main-actions">
                  <button
                    type="button"
                    className="history-clean-all"
                    disabled={cleaningHistory !== null}
                    onClick={() => clearHistoryView('*')}
                  >
                    <EyeOff />
                    Limpar tela toda
                  </button>

                  <button
                    type="button"
                    className="history-restore-all"
                    disabled={cleaningHistory !== null}
                    onClick={() => restoreHistoryView()}
                  >
                    <RotateCcw />
                    Restaurar histórico
                  </button>
                </div>
              </div>

              <div className="history-clean-grid">
                {HISTORY_MODULES.map((module) => (
                  <div
                    key={module.key}
                    className="history-clean-module"
                  >
                    <span>{module.label}</span>

                    <div>
                      <button
                        type="button"
                        disabled={cleaningHistory !== null}
                        onClick={() => clearHistoryView(module.key)}
                      >
                        {cleaningHistory === module.key
                          ? 'Limpando...'
                          : 'Limpar'}
                      </button>

                      <button
                        type="button"
                        className="history-module-restore"
                        disabled={cleaningHistory !== null}
                        onClick={() => restoreHistoryView(module.key)}
                        title={`Restaurar histórico de ${module.label}`}
                      >
                        <RotateCcw />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {loadingLogs ? (
              <div className="settings-empty">Carregando histórico...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="settings-empty">
                <Clock3 />
                <strong>Nenhum registro encontrado</strong>
                <span>
                  As próximas alterações do sistema aparecerão aqui.
                </span>
              </div>
            ) : (
              <div className="history-list">
                {filteredLogs.map((item) => (
                  <article key={item.id} className="history-item">
                    <div
                      className={`history-action history-action-${item.action}`}
                    >
                      {ACTION_LABELS[item.action]}
                    </div>

                    <div className="history-content">
                      <strong>
                        {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
                      </strong>

                      <span>
                        {item.description ??
                          `${ACTION_LABELS[item.action]} em ${
                            ENTITY_LABELS[item.entity_type] ?? item.entity_type
                          }`}
                      </span>

                      <small>
                        {item.actor_name || 'Usuário'} ·{' '}
                        {formatDateTime(item.created_at)}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'dados' && owner && (
          <section className="settings-card danger-zone">
            <div className="settings-card-header">
              <div className="settings-icon danger-icon">
                <ShieldAlert />
              </div>

              <div>
                <h2>Zona de segurança</h2>
                <p>
                  Ações irreversíveis para limpeza dos dados cadastrados.
                </p>
              </div>
            </div>

            <div className="danger-options">
              <article>
                <div>
                  <strong>Limpar dados operacionais</strong>
                  <p>
                    Apaga eventos, escalas, presenças, pagamentos,
                    adiantamentos e marmitas. Mantém clientes, trabalhadores,
                    usuários e histórico.
                  </p>
                </div>

                <button
                  className="danger-button"
                  onClick={() => openClear('operations')}
                >
                  Limpar operação
                </button>
              </article>

              <article>
                <div>
                  <strong>Limpar todos os dados empresariais</strong>
                  <p>
                    Além dos dados operacionais, remove clientes e
                    trabalhadores. Usuários, perfis e histórico permanecem.
                  </p>
                </div>

                <button
                  className="danger-button danger-button-strong"
                  onClick={() => openClear('all')}
                >
                  Limpar tudo
                </button>
              </article>
            </div>
          </section>
        )}
      </main>

      {clearMode && (
        <div className="settings-confirm-overlay" onMouseDown={closeClear}>
          <div
            className="settings-confirm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ShieldAlert />

            <h2>
              {clearMode === 'operations'
                ? 'Limpar dados operacionais?'
                : 'Limpar todos os dados empresariais?'}
            </h2>

            <p>
              Esta ação não pode ser desfeita. O histórico e as contas de
              acesso serão preservados.
            </p>

            <label>
              <span>
                Digite{' '}
                <strong>
                  {clearMode === 'operations'
                    ? 'LIMPAR OPERACAO'
                    : 'LIMPAR TUDO'}
                </strong>{' '}
                para confirmar:
              </span>

              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoFocus
              />
            </label>

            <div className="settings-confirm-actions">
              <button
                className="settings-cancel"
                onClick={closeClear}
                disabled={clearing}
              >
                Cancelar
              </button>

              <button
                className="danger-button danger-button-strong"
                onClick={executeClear}
                disabled={clearing}
              >
                {clearing ? 'Limpando...' : 'Confirmar limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
