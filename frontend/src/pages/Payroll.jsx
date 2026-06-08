import { useState, useEffect } from 'react'
import axios from 'axios'
import PayrollList from '../components/PayrollList'

function Payroll() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [month, setMonth] = useState('')
  const [allowance, setAllowance] = useState('')
  const [deduction, setDeduction] = useState('')
  const [payrollList, setPayrollList] = useState([])

  useEffect(() => {
    fetchEmployees()
    fetchPayroll()
  }, [])

  const fetchEmployees = () => {
    axios.get('http://localhost:3000/api/employees')
      .then(res => setEmployees(res.data))
  }

  const fetchPayroll = () => {
    axios.get('http://localhost:3000/api/payroll')
      .then(res => setPayrollList(res.data))
  }

  const calculatePayroll = () => {
    if (!selectedEmployee || !month || !allowance || !deduction) {
      alert('Please fill all fields!')
      return
    }
    axios.post('http://localhost:3000/api/payroll', {
      employee_id: selectedEmployee,
      month,
      allowance,
      deduction
    }).then(() => {
      fetchPayroll()
      setSelectedEmployee('')
      setMonth('')
      setAllowance('')
      setDeduction('')
    })
  }

  const inputStyle = {
    padding: '12px 16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{
        color: '#2c3e50',
        marginBottom: '30px',
        textAlign: 'center',
        fontSize: '36px'
      }}>
        💵 Payroll Management
      </h1>

      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <h2 style={{
          color: '#2c3e50',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          🧮 Calculate Salary
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            style={inputStyle}
          >
            <option value="">👤 Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <input
            placeholder="📅 Month (e.g. June 2026)"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="➕ Allowance"
            value={allowance}
            onChange={e => setAllowance(e.target.value)}
            type="number"
            style={inputStyle}
          />
          <input
            placeholder="➖ Deduction"
            value={deduction}
            onChange={e => setDeduction(e.target.value)}
            type="number"
            style={inputStyle}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={calculatePayroll}
            style={{
              backgroundColor: '#2ecc71',
              color: 'white',
              padding: '13px 40px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🧮 Calculate & Save
          </button>
        </div>
      </div>

      <PayrollList payrollList={payrollList} onDelete={fetchPayroll} />
    </div>
  )
}

export default Payroll