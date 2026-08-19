'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import {
  LayoutDashboard,
  CalendarDays,
  UsersRound,
  UserRoundCheck,
  FileText,
  WalletCards,
  TrendingUp,
  DollarSign,
  BriefcaseBusiness,
  UtensilsCrossed,
  Bus,
  Settings,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react'

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

  const owner = role === 'owner'
  const controlled = typeof menuOpen === 'boolean'
  const open = controlled ? menuOpen : internalOpen

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
          <div className="dash-logo">O</div>

          <div>
            <strong>MÃO DE OBRA</strong>
            <span>TERCEIRIZADA</span>
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
            <Link
              href="/dashboard"
              className={active('/dashboard')}
              onClick={closeMobileMenu}
            >
              <LayoutDashboard />
              Dashboard
            </Link>

            <Link
              href="/clientes"
              className={active('/clientes')}
              onClick={closeMobileMenu}
            >
              <UsersRound />
              Clientes
            </Link>

            <Link
              href="/orcamentos"
              className={active('/orcamentos')}
              onClick={closeMobileMenu}
            >
              <FileText />
              Orçamentos
            </Link>

            <Link
              href="/eventos"
              className={active('/eventos')}
              onClick={closeMobileMenu}
            >
              <CalendarDays />
              Eventos
            </Link>

            <Link
              href="/escalas"
              className={active('/escalas')}
              onClick={closeMobileMenu}
            >
              <ClipboardCheck />
              Escalas
            </Link>

            <Link
              href="/trabalhadores"
              className={active('/trabalhadores')}
              onClick={closeMobileMenu}
            >
              <UsersRound />
              Trabalhadores
            </Link>

            <Link
              href="/presencas"
              className={active('/presencas')}
              onClick={closeMobileMenu}
            >
              <UserRoundCheck />
              Presenças
            </Link>
          </nav>

          <div className="nav-title">FINANCEIRO</div>

          <nav className="dash-nav">
            {owner && (
              <Link
                href="/financeiro"
                className={active('/financeiro')}
                onClick={closeMobileMenu}
              >
                <WalletCards />
                Financeiro
              </Link>
            )}

            <Link
              href="/pagamentos"
              className={active('/pagamentos')}
              onClick={closeMobileMenu}
            >
              <DollarSign />
              Pagamentos
            </Link>

            <Link
              href="/adiantamentos"
              className={active('/adiantamentos')}
              onClick={closeMobileMenu}
            >
              <BriefcaseBusiness />
              Adiantamentos
            </Link>

            <Link
              href="/marmitas"
              className={active('/marmitas')}
              onClick={closeMobileMenu}
            >
              <UtensilsCrossed />
              Marmitas
            </Link>

            <Link
              href="/transporte"
              className={active('/transporte')}
              onClick={closeMobileMenu}
            >
              <Bus />
              Transporte
            </Link>
          </nav>

          {owner && (
            <>
              <div className="nav-title">RELATÓRIOS</div>

              <nav className="dash-nav">
                <Link
                  href="/relatorios"
                  className={active('/relatorios')}
                  onClick={closeMobileMenu}
                >
                  <FileText />
                  Relatórios
                </Link>

                <Link
                  href="/indicadores"
                  className={active('/indicadores')}
                  onClick={closeMobileMenu}
                >
                  <TrendingUp />
                  Indicadores
                </Link>
              </nav>
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          <Link
            href="/configuracoes"
            className={active('/configuracoes')}
            onClick={closeMobileMenu}
          >
            <Settings />
            Configurações
          </Link>

          <div className="dash-user">
            <div className="avatar">
              {fullName?.charAt(0)?.toUpperCase() || 'U'}
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