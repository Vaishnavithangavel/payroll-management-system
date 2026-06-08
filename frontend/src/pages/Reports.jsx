import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import PageNavigation from '../components/PageNavigation'

function Reports() {
  const [tab, setTab] = useState('monthly')
  const [monthlyData, setMonthlyData] = useState(null)
  const [annualData, setAnnualData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, a] = await Promise.all([
        axios.get('http://localhost:3000/api/reports/monthly'),
        axios.get('http://localhost:3000/api/reports/annual')
      ])
      setMonthlyData(m.data)
      setAnnualData(a.data || [])
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error'
      console.error('Reports fetch error:', msg)
      setError(msg)
    }
    setLoading(false)
  }

  const fmt = (val) => '₹' + Math.round(val).toLocaleString()

  const statCard = (label, value, color, icon) => (
    <div key={label} style={{
      background: 'white',
      borderRadius: '14px',
      padding: '22px 20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      borderTop: `4px solid ${color}`,
      flex: '1',
      minWidth: '160px'
    }}>
      <div style={{ fontSize: '26px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '8px', fontSize: '34px' }}>
        📊 Payroll Reports
      </h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>
        View monthly summaries and payroll trends with charts
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { id: 'monthly', label: '📅 Monthly Summary' },
          { id: 'annual', label: '📈 Annual Trends' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              background: tab === t.id
                ? 'linear-gradient(135deg, #2c3e50, #3498db)'
                : 'white',
              color: tab === t.id ? 'white' : '#555',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchAll}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            background: '#f0f2f5',
            color: '#555',
            marginLeft: 'auto'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa', fontSize: '16px' }}>
          ⏳ Loading reports...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          background: '#fdecea',
          border: '1px solid #f5c6cb',
          borderRadius: '12px',
          padding: '20px 24px',
          color: '#c0392b',
          marginBottom: '20px'
        }}>
          <strong>❌ Failed to load reports:</strong> {error}
          <br />
          <small style={{ color: '#888' }}>Make sure your backend server is running on port 3000.</small>
        </div>
      )}

      {/* ── Monthly Summary Tab ── */}
      {!loading && !error && tab === 'monthly' && (
        <>
          {!monthlyData || monthlyData.summary.count === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#aaa',
              padding: '80px 20px',
              fontSize: '16px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              No payroll records yet.<br />
              <small>Calculate a payroll first to see the monthly summary.</small>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
                {statCard('Total Records', monthlyData.summary.count, '#3498db', '📋')}
                {statCard('Total Gross', fmt(monthlyData.summary.totalGross), '#f39c12', '💵')}
                {statCard('Total PT', fmt(monthlyData.summary.totalPT), '#e67e22', '🧾')}
                {statCard('Total SS', fmt(monthlyData.summary.totalSS), '#9b59b6', '🏦')}
                {statCard('Total Net Paid', fmt(monthlyData.summary.totalNet), '#2ecc71', '✅')}
              </div>

              {/* Bar Chart — Net by Department */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                marginBottom: '28px'
              }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                  🏢 Net Salary by Department
                </h3>
                {monthlyData.byDepartment.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '30px' }}>No department data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData.byDepartment.map(d => ({
                      dept: d.department,
                      'Net Paid': Math.round(d.total_net),
                      'Gross': Math.round(d.total_gross)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} />
                      <Tooltip formatter={v => '₹' + v.toLocaleString()} />
                      <Legend />
                      <Bar dataKey="Gross" fill="#bde0fe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Net Paid" fill="#3498db" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Records Table */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)'
              }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📋 All Records</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #2c3e50, #3498db)',
                        color: 'white'
                      }}>
                        {['Name', 'Dept', 'Month', 'Basic', 'Allowance', 'PT', 'SS', 'Net'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.records.map((r, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            textAlign: 'center',
                            background: i % 2 === 0 ? '#fafbfc' : 'white'
                          }}
                        >
                          <td style={{ padding: '11px 14px' }}>👤 {r.name}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{
                              background: '#e8f4fd',
                              color: '#3498db',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>{r.department}</span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#9b59b6', fontWeight: '600' }}>{r.month}</td>
                          <td style={{ padding: '11px 14px' }}>₹{parseFloat(r.basic_salary).toLocaleString()}</td>
                          <td style={{ padding: '11px 14px', color: '#2ecc71' }}>+₹{parseFloat(r.allowance).toLocaleString()}</td>
                          <td style={{ padding: '11px 14px', color: '#e67e22' }}>₹{r.pt}</td>
                          <td style={{ padding: '11px 14px', color: '#9b59b6' }}>₹{r.ss}</td>
                          <td style={{ padding: '11px 14px', fontWeight: '700', color: '#2c3e50', fontSize: '15px' }}>
                            ₹{parseFloat(r.net_salary).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Annual Trends Tab ── */}
      {!loading && !error && tab === 'annual' && (
        <>
          {/* Gross vs Net Line Chart */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            marginBottom: '28px'
          }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
              📈 Gross vs Net — Payroll Trend
            </h3>
            {annualData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                No data yet. Add payroll records to see trends!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={annualData.map(r => ({
                  month: r.month,
                  'Total Gross': Math.round(parseFloat(r.total_gross)),
                  'Total Net': Math.round(parseFloat(r.total_net)),
                  'Tax (PT+SS)': Math.round(parseFloat(r.total_pt) + parseFloat(r.total_ss))
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip formatter={v => '₹' + v.toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="Total Gross" stroke="#f39c12" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Total Net" stroke="#2ecc71" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Tax (PT+SS)" stroke="#e74c3c" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Employees per Month Bar Chart */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            marginBottom: '28px'
          }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
              👥 Employees Processed per Month
            </h3>
            {annualData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annualData.map(r => ({
                  month: r.month,
                  Employees: parseInt(r.employees)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Employees" fill="#9b59b6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Month-wise Summary Table */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)'
          }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📊 Month-wise Summary</h3>
            {annualData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '30px' }}>No data yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      background: 'linear-gradient(135deg, #2c3e50, #3498db)',
                      color: 'white'
                    }}>
                      {['Month', 'Employees', 'Total Gross', 'Total PT', 'Total SS', 'Total Net'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {annualData.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          textAlign: 'center',
                          background: i % 2 === 0 ? '#fafbfc' : 'white'
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: '600', color: '#9b59b6' }}>{r.month}</td>
                        <td style={{ padding: '12px' }}>{r.employees}</td>
                        <td style={{ padding: '12px' }}>₹{Math.round(parseFloat(r.total_gross)).toLocaleString()}</td>
                        <td style={{ padding: '12px', color: '#e67e22' }}>₹{parseFloat(r.total_pt).toLocaleString()}</td>
                        <td style={{ padding: '12px', color: '#9b59b6' }}>₹{parseFloat(r.total_ss).toLocaleString()}</td>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#27ae60', fontSize: '15px' }}>
                          ₹{Math.round(parseFloat(r.total_net)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      <PageNavigation
  previous={{
    path: "/payroll",
    label: "Payroll",
  }}
  next={{
    path:"/",
    label:"Home"
  }}
/>
    </div>
  )
}

export default Reports