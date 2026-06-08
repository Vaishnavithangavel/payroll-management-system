import axios from 'axios'

function PayrollList({ payrollList, onDelete }) {
  const deletePayroll = (id) => {
    if (window.confirm('Are you sure you want to delete this payroll record?')) {
      axios.delete(`http://localhost:3000/api/payroll/${id}`)
        .then(() => onDelete())
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #2c3e50, #3498db)',
              color: 'white'
            }}>
              <th style={{ padding: '14px', textAlign: 'center' }}>Employee</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Month</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Basic Salary</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Allowance</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Deduction</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Net Salary</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payrollList.map(p => (
              <tr key={p.id} style={{
                borderBottom: '1px solid #eee',
                textAlign: 'center'
              }}>
                <td style={{ padding: '14px' }}>
                  👤 {p.name}
                </td>
                <td style={{ padding: '14px' }}>
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
                <td style={{ padding: '14px' }}>
                  ₹{parseFloat(p.basic_salary).toLocaleString()}
                </td>
                <td style={{ padding: '14px', color: '#2ecc71', fontWeight: 'bold' }}>
                  +₹{parseFloat(p.allowance).toLocaleString()}
                </td>
                <td style={{ padding: '14px', color: '#e74c3c', fontWeight: 'bold' }}>
                  -₹{parseFloat(p.deduction).toLocaleString()}
                </td>
                <td style={{
                  padding: '14px',
                  color: '#2c3e50',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  ₹{parseFloat(p.net_salary).toLocaleString()}
                </td>
                <td style={{ padding: '14px' }}>
                  <button
                    onClick={() => deletePayroll(p.id)}
                    style={{
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PayrollList