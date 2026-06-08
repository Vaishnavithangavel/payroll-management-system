import axios from 'axios'

function PayrollList({ payrollList, onDelete }) {

  const deletePayroll = (id) => {
    if (window.confirm('Are you sure you want to delete this payroll record?')) {
      axios.delete(`http://localhost:3000/api/payroll/${id}`)
        .then(() => onDelete())
    }
  }

  // 🆕 Download payslip as PDF
  const downloadPayslip = async (id, name, month) => {
    try {
      const response = await fetch(`http://localhost:3000/api/payslip/${id}`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip_${name.replace(' ', '_')}_${month}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error downloading payslip: ' + err.message)
    }
  }

  return (
    <div style={{
      background: 'white',
      padding: '30px',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{
        color: '#2c3e50',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        💵 Payroll Records
      </h2>

      {payrollList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#aaa',
          fontSize: '16px'
        }}>
          No payroll records found. Calculate one above! 👆
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #2c3e50, #3498db)',
                color: 'white'
              }}>
                <th style={{ padding: '14px', textAlign: 'center' }}>Employee</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Month</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Basic</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Allowance</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Deduction</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>PT</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>SS</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Net Salary</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollList.map(p => (
                <tr key={p.id} style={{
                  borderBottom: '1px solid #eee',
                  textAlign: 'center'
                }}>
                  <td style={{ padding: '12px' }}>👤 {p.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      backgroundColor: '#f0e6ff',
                      color: '#9b59b6',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {p.month}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    ₹{parseFloat(p.basic_salary).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', color: '#2ecc71', fontWeight: 'bold' }}>
                    +₹{parseFloat(p.allowance).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', color: '#e74c3c', fontWeight: 'bold' }}>
                    -₹{parseFloat(p.deduction).toLocaleString()}
                  </td>

                  {/* 🆕 PT column */}
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: '#fef9e7',
                      color: '#f39c12',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ₹{p.pt || 0}
                    </span>
                  </td>

                  {/* 🆕 SS column */}
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: '#f4ecff',
                      color: '#9b59b6',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ₹{p.ss || 0}
                    </span>
                  </td>

                  <td style={{
                    padding: '12px',
                    color: '#2c3e50',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    ₹{parseFloat(p.net_salary).toLocaleString()}
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {/* 🆕 Download PDF button */}
                      <button
                        onClick={() => downloadPayslip(p.id, p.name, p.month)}
                        style={{
                          backgroundColor: '#3498db',
                          color: 'white',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={() => deletePayroll(p.id)}
                        style={{
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PayrollList