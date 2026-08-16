'use client'

import AppSidebar from '@/components/AppSidebar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  UsersRound,
  LogOut,
  Moon,
  Sun,
  Bell,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Menu,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

type DashboardProps = {
  email: string
  fullName: string
  role: string
}

export default function DashboardClient({
  email,
  fullName,
  role,
}: DashboardProps) {
  const router = useRouter()

  const [dark, setDark] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true

    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
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

  const owner = role === 'owner'

  return (
    <div className="dashboard-shell">

      {/* =====================================================
          MENU LATERAL
      ===================================================== */}

      <AppSidebar
        fullName={fullName}
        role={role}
        menuOpen={menuOpen}
      />

      {/* =====================================================
          CONTEÚDO PRINCIPAL
      ===================================================== */}

      <main className="dashboard-main">

        {/* HEADER */}

        <header className="dashboard-header">

          <div className="dashboard-title-area">

            <button
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menu"
            >
              <Menu />
            </button>

            <div>
              <span className="eyebrow">
                VISÃO GERAL
              </span>

              <h1>
                Dashboard Principal
              </h1>

              <p>
                Visão geral completa da operação em tempo real
              </p>
            </div>

          </div>

          <div className="dashboard-actions">

            <button
              className="icon-btn"
              aria-label="Notificações"
            >
              <Bell />

              <span className="notification-dot" />
            </button>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alterar tema"
            >
              {dark ? <Sun /> : <Moon />}
            </button>

            <div className="header-user">

              <div className="avatar">
                {fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              <div>
                <strong>{fullName}</strong>

                <span>
                  {owner ? 'Administrador' : 'Operacional'}
                </span>
              </div>

              <ChevronDown />

            </div>

            <button
              className="logout-btn"
              onClick={logout}
            >
              <LogOut />
              Sair
            </button>

          </div>

        </header>

        {/* =====================================================
            CARDS SUPERIORES
        ===================================================== */}

        <section className="summary-grid">

          {owner && (
            <article className="summary-card blue-card">

              <div>
                <span>
                  FATURAMENTO (PERÍODO)
                </span>

                <strong>
                  R$ 245.780,00
                </strong>

                <small className="positive">
                  ↑ 18,6% vs mês anterior
                </small>
              </div>

              <TrendingUp className="summary-icon" />

            </article>
          )}

          {owner && (
            <article className="summary-card green-card">

              <div>
                <span>
                  LUCRO LÍQUIDO (PERÍODO)
                </span>

                <strong>
                  R$ 71.540,00
                </strong>

                <small className="positive">
                  ↑ 22,4% vs mês anterior
                </small>
              </div>

              <DollarSign className="summary-icon" />

            </article>
          )}

          <article className="summary-card orange-card">

            <div>
              <span>
                EVENTOS EM ANDAMENTO
              </span>

              <strong>
                8
              </strong>

              <small>
                24 próximos 7 dias
              </small>
            </div>

            <CalendarDays className="summary-icon" />

          </article>

          <article className="summary-card purple-card">

            <div>
              <span>
                TRABALHADORES ATIVOS
              </span>

              <strong>
                156
              </strong>

              <small>
                Em eventos hoje
              </small>
            </div>

            <UsersRound className="summary-icon" />

          </article>

        </section>

        {/* =====================================================
            PAINÉIS
        ===================================================== */}

        <section className="dashboard-grid">

          {/* FATURAMENTO X CUSTOS */}

          {owner && (
            <article className="dash-panel chart-panel">

              <div className="panel-header">

                <div>
                  <h3>
                    FATURAMENTO VS CUSTOS VS LUCRO
                  </h3>
                </div>

                <button className="period-btn">
                  Mensal
                  <ChevronDown />
                </button>

              </div>

              <div className="chart-legend">

                <span>
                  <i className="legend-blue" />
                  Faturamento
                </span>

                <span>
                  <i className="legend-red" />
                  Custos
                </span>

                <span>
                  <i className="legend-green" />
                  Lucro
                </span>

              </div>

              <div className="line-chart">

                <div className="chart-grid-lines" />

                <svg
                  viewBox="0 0 700 230"
                  preserveAspectRatio="none"
                  className="chart-svg"
                >

                  <polyline
                    className="line revenue-line"
                    points="
                      0,185
                      100,165
                      200,125
                      300,110
                      400,112
                      500,75
                      600,38
                      700,18
                    "
                  />

                  <polyline
                    className="line cost-line"
                    points="
                      0,210
                      100,190
                      200,160
                      300,145
                      400,138
                      500,125
                      600,95
                      700,72
                    "
                  />

                  <polyline
                    className="line profit-line"
                    points="
                      0,225
                      100,217
                      200,202
                      300,196
                      400,180
                      500,179
                      600,165
                      700,155
                    "
                  />

                </svg>

                <div className="chart-dates">
                  <span>01/05</span>
                  <span>06/05</span>
                  <span>11/05</span>
                  <span>16/05</span>
                  <span>21/05</span>
                  <span>26/05</span>
                  <span>31/05</span>
                </div>

              </div>

            </article>
          )}

          {/* DISTRIBUIÇÃO DE CUSTOS */}

          {owner && (
            <article className="dash-panel costs-panel">

              <div className="panel-header">

                <div>
                  <h3>
                    DISTRIBUIÇÃO DE CUSTOS
                  </h3>
                </div>

              </div>

              <div className="cost-content">

                <div className="donut">

                  <div className="donut-center">

                    <small>
                      Total
                    </small>

                    <strong>
                      R$ 174.240
                    </strong>

                  </div>

                </div>

                <div className="cost-list">

                  <div>
                    <span>
                      <i className="cost-blue" />
                      Mão de obra
                    </span>

                    <strong>58%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="cost-purple" />
                      Transporte
                    </span>

                    <strong>18%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="cost-orange" />
                      Marmitas
                    </span>

                    <strong>12%</strong>
                  </div>

                  <div>
                    <span>
                      <i className="cost-green" />
                      Outros custos
                    </span>

                    <strong>12%</strong>
                  </div>

                </div>

              </div>

            </article>
          )}

          {/* EVENTOS */}

          <article
            className={`dash-panel events-panel ${
              !owner ? 'full-width-panel' : ''
            }`}
          >

            <div className="panel-header">

              <div>
                <h3>
                  EVENTOS EM ANDAMENTO
                </h3>
              </div>

              <button className="period-btn" onClick={() => router.push('/eventos')}>
                Ver todos
              </button>

            </div>

            <div className="event-table-wrapper">

              <table className="event-table">

                <thead>

                  <tr>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Período</th>
                    <th>Trabalhadores</th>
                    <th>Status</th>
                    <th>% Conclusão</th>
                  </tr>

                </thead>

                <tbody>

                  <tr>

                    <td>
                      Expo Center Norte
                    </td>

                    <td>
                      Empresa ABC
                    </td>

                    <td>
                      20/05 - 24/05
                    </td>

                    <td>
                      45
                    </td>

                    <td>
                      <span className="status running">
                        Em andamento
                      </span>
                    </td>

                    <td>
                      <div className="progress">
                        <span style={{ width: '60%' }} />
                      </div>
                    </td>

                  </tr>

                  <tr>

                    <td>
                      Feira Industrial SP
                    </td>

                    <td>
                      Indústria XYZ
                    </td>

                    <td>
                      18/05 - 22/05
                    </td>

                    <td>
                      32
                    </td>

                    <td>
                      <span className="status running">
                        Em andamento
                      </span>
                    </td>

                    <td>
                      <div className="progress">
                        <span style={{ width: '40%' }} />
                      </div>
                    </td>

                  </tr>

                  <tr>

                    <td>
                      Show Nacional
                    </td>

                    <td>
                      Produtora LMN
                    </td>

                    <td>
                      21/05 - 22/05
                    </td>

                    <td>
                      28
                    </td>

                    <td>
                      <span className="status running">
                        Em andamento
                      </span>
                    </td>

                    <td>
                      <div className="progress">
                        <span style={{ width: '80%' }} />
                      </div>
                    </td>

                  </tr>

                  <tr>

                    <td>
                      Evento Corporativo
                    </td>

                    <td>
                      Empresa 123
                    </td>

                    <td>
                      25/05 - 26/05
                    </td>

                    <td>
                      18
                    </td>

                    <td>
                      <span className="status scheduled">
                        Programado
                      </span>
                    </td>

                    <td>
                      <div className="progress">
                        <span style={{ width: '0%' }} />
                      </div>
                    </td>

                  </tr>

                  <tr>

                    <td>
                      Convenção Anual
                    </td>

                    <td>
                      Corporativo QWE
                    </td>

                    <td>
                      28/05 - 30/05
                    </td>

                    <td>
                      35
                    </td>

                    <td>
                      <span className="status scheduled">
                        Programado
                      </span>
                    </td>

                    <td>
                      <div className="progress">
                        <span style={{ width: '0%' }} />
                      </div>
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </article>

          {/* FLUXO DE CAIXA */}

          {owner && (
            <article className="dash-panel cash-panel">

              <div className="panel-header">

                <div>
                  <h3>
                    FLUXO DE CAIXA (PERÍODO)
                  </h3>
                </div>

                <button className="period-btn">
                  Mensal
                  <ChevronDown />
                </button>

              </div>

              <div className="cash-legend">

                <span>
                  <i className="legend-green" />
                  Recebimentos
                </span>

                <span>
                  <i className="legend-red" />
                  Pagamentos
                </span>

              </div>

              <div className="bar-chart">

                {[70, 94, 83, 89, 78, 100, 85, 76].map(
                  (height, index) => (
                    <div
                      className="bar-group"
                      key={index}
                    >

                      <div
                        className="bar income"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                      <div
                        className="bar expense"
                        style={{
                          height: `${Math.max(
                            height - 25,
                            30
                          )}%`,
                        }}
                      />

                    </div>
                  )
                )}

              </div>

            </article>
          )}

        </section>

      </main>

    </div>
  )
}