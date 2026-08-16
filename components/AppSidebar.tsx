'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
} from 'lucide-react'

type AppSidebarProps = {
  fullName: string
  role: string
  menuOpen?: boolean
}

export default function AppSidebar({
  fullName,
  role,
  menuOpen = false,
}: AppSidebarProps) {
  const pathname = usePathname()

  const owner = role === 'owner'

  function active(path: string) {
    return pathname === path ? 'active' : ''
  }

  return (
    <aside className={`dash-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="dash-brand">
        <div className="dash-logo">O</div>

        <div>
          <strong>MÃO DE OBRA</strong>
          <span>TERCEIRIZADA</span>
        </div>
      </div>

      <div className="nav-title">
        OPERAÇÃO
      </div>

      <nav className="dash-nav">
        <Link
          href="/dashboard"
          className={active('/dashboard')}
        >
          <LayoutDashboard />
          Dashboard
        </Link>

        <Link
          href="/clientes"
          className={active('/clientes')}
        >
          <UsersRound />
          Clientes
        </Link>

        <Link
          href="/orcamentos"
          className={active('/orcamentos')}
        >
          <FileText />
          Orçamentos
        </Link>

        <Link
          href="/eventos"
          className={active('/eventos')}
        >
          <CalendarDays />
          Eventos
        </Link>

        <Link
          href="/escalas"
          className={active('/escalas')}
        >
          <ClipboardCheck />
          Escalas
        </Link>

        <Link
          href="/trabalhadores"
          className={active('/trabalhadores')}
        >
          <UsersRound />
          Trabalhadores
        </Link>

        <Link
          href="/presencas"
          className={active('/presencas')}
        >
          <UserRoundCheck />
          Presenças
        </Link>
      </nav>

      <div className="nav-title">
        FINANCEIRO
      </div>

      <nav className="dash-nav">
        {owner && (
          <Link
            href="/financeiro"
            className={active('/financeiro')}
          >
            <WalletCards />
            Financeiro
          </Link>
        )}

        <Link
          href="/pagamentos"
          className={active('/pagamentos')}
        >
          <DollarSign />
          Pagamentos
        </Link>

        <Link
          href="/adiantamentos"
          className={active('/adiantamentos')}
        >
          <BriefcaseBusiness />
          Adiantamentos
        </Link>

        <Link
          href="/marmitas"
          className={active('/marmitas')}
        >
          <UtensilsCrossed />
          Marmitas
        </Link>

        <Link
          href="/transporte"
          className={active('/transporte')}
        >
          <Bus />
          Transporte
        </Link>
      </nav>

      {owner && (
        <>
          <div className="nav-title">
            RELATÓRIOS
          </div>

          <nav className="dash-nav">
            <Link
              href="/relatorios"
              className={active('/relatorios')}
            >
              <FileText />
              Relatórios
            </Link>

            <Link
              href="/indicadores"
              className={active('/indicadores')}
            >
              <TrendingUp />
              Indicadores
            </Link>
          </nav>
        </>
      )}

      <div className="sidebar-bottom">
        <Link
          href="/configuracoes"
          className={active('/configuracoes')}
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

            <span>
              {owner ? 'Administrador' : 'Operacional'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}