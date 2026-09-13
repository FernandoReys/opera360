'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  UsersRound,
  UserRoundCheck,
  FileText,
  WalletCards,
  TrendingUp,
  DollarSign,
  BriefcaseBusiness,
  UtensilsCrossed,
  Bus,
  ReceiptText,
  Settings,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type AppSidebarProps = {
  fullName: string
  role: string
  menuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

export default function AppSidebar({
  fullName,
  role,
  menuOpen,
  onMenuOpenChange,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const owner = role === 'owner'
  const controlled = typeof menuOpen === 'boolean'
  const open = controlled ? menuOpen : internalOpen

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

  function setOpen(next: boolean) {
    if (controlled) {
      onMenuOpenChange?.(next)
      return
    }

    setInternalOpen(next)
  }

  function active(path: string) {
    return pathname === path ? 'active' : ''
  }

  function closeMobileMenu() {
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
      >
        {open ? <X /> : <Menu />}
      </button>

      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`dash-sidebar ${open ? 'open' : ''}`}>
        <div className="dash-brand">
          <div className="dash-logo">CW</div>
          <div className="conectworks-brand">
            <strong>CONECT<span>WORKS</span></strong>
            <small>EVENTOS &amp; SERVIÇOS</small>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeMobileMenu}
            aria-label="Fechar menu"
          >
            <X />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-title">OPERAÇÃO</div>
          <nav className="dash-nav">
            <Link href="/dashboard" className={active('/dashboard')} onClick={closeMobileMenu}><LayoutDashboard />Dashboard</Link>
            <Link href="/clientes" className={active('/clientes')} onClick={closeMobileMenu}><UsersRound />Clientes</Link>
            <Link href="/orcamentos" className={active('/orcamentos')} onClick={closeMobileMenu}><FileText />Orçamentos</Link>
            <Link href="/eventos" className={active('/eventos')} onClick={closeMobileMenu}><CalendarDays />Eventos</Link>
            <Link href="/eventos-do-dia" className={active('/eventos-do-dia')} onClick={closeMobileMenu}><CalendarClock />Eventos do dia</Link>
            <Link href="/trabalhadores" className={active('/trabalhadores')} onClick={closeMobileMenu}><UsersRound />Trabalhadores</Link>
            <Link href="/escalas" className={active('/escalas')} onClick={closeMobileMenu}><ClipboardCheck />Escalas</Link>
            <Link href="/presencas" className={active('/presencas')} onClick={closeMobileMenu}><UserRoundCheck />Presenças</Link>
          </nav>

          <div className="nav-title">FINANCEIRO</div>
          <nav className="dash-nav">
            {owner && <Link href="/financeiro" className={active('/financeiro')} onClick={closeMobileMenu}><WalletCards />Financeiro</Link>}
            <Link href="/pagamentos" className={active('/pagamentos')} onClick={closeMobileMenu}><DollarSign />Pagamentos</Link>
            {owner && <Link href="/fechamento" className={active('/fechamento')} onClick={closeMobileMenu}><ReceiptText />Fechamentos</Link>}
            <Link href="/adiantamentos" className={active('/adiantamentos')} onClick={closeMobileMenu}><BriefcaseBusiness />Adiantamentos</Link>
            <Link href="/marmitas" className={active('/marmitas')} onClick={closeMobileMenu}><UtensilsCrossed />Marmitas</Link>
            <Link href="/transporte" className={active('/transporte')} onClick={closeMobileMenu}><Bus />Transporte</Link>
          </nav>

          {owner && (
            <>
              <div className="nav-title">RELATÓRIOS</div>
              <nav className="dash-nav">
                <Link href="/relatorios" className={active('/relatorios')} onClick={closeMobileMenu}><FileText />Relatórios</Link>
                <Link href="/indicadores" className={active('/indicadores')} onClick={closeMobileMenu}><TrendingUp />Indicadores</Link>
              </nav>
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          <Link href="/configuracoes" className={active('/configuracoes')} onClick={closeMobileMenu}><Settings />Configurações</Link>
          <div className="dash-user">
            <div className="avatar profile-sidebar-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`Foto de ${fullName}`} />
              ) : (
                fullName?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <strong>{fullName}</strong>
              <span>{owner ? 'Administrador' : 'Operacional'}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
