import { useState, useEffect } from 'react'
import axios from 'axios'

function Home() {
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [totalPayroll, setTotalPayroll] = useState(0)
  const [totalDepartments, setTotalDepartments] = useState(0)

  useEffect(() => {
    axios.get('http://localhost:3000/api/employees')
      .then(res => {
        setTotalEmployees(res.data.length)
        const departments = [...new Set(res.data.map(e => e.department))]
        setTotalDepartments(departments.length)
      })
    axios.get('http://localhost:3000/api/payroll')
      .then(res => {
        const total = res.data.reduce((sum, p) => sum + parseFloat(p.net_salary), 0)
        setTotalPayroll(total)
      })
  }, [])

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{
        color: '#2c3e50',
        fontSize: '32px',
        marginBottom: '10px'
      }}>
        💰 Payroll Management System
      </h1>
      <p style={{ color: '#7f8c8d', marginBottom: '40px', fontSize: '16px' }}>
        Manage your employees and payroll easily
      </p>

      {/* Stats Cards */}
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        marginBottom: '40px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          color: 'white',
          padding: '30px',
          borderRadius: '16px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 4px 15px rgba(52,152,219,0.4)'
        }}>
          <div style={{ fontSize: '40px' }}>👨‍💼</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '10px 0' }}>
            {totalEmployees}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Total Employees</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
          color: 'white',
          padding: '30px',
          borderRadius: '16px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 4px 15px rgba(46,204,113,0.4)'
        }}>
          <div style={{ fontSize: '40px' }}>💵</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '10px 0' }}>
            ₹{totalPayroll.toLocaleString()}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Total Payroll</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
          color: 'white',
          padding: '30px',
          borderRadius: '16px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 4px 15px rgba(155,89,182,0.4)'
        }}>
          <div style={{ fontSize: '40px' }}>🏢</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '10px 0' }}>
            {totalDepartments}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Departments</div>
        </div>
      </div>

      {/* Quick Info */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🚀 Quick Guide</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              backgroundColor: '#3498db',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>1</span>
            <span style={{ color: '#555', fontSize: '15px' }}>
              Go to <b>Employees</b> page to add new employees
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              backgroundColor: '#2ecc71',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>2</span>
            <span style={{ color: '#555', fontSize: '15px' }}>
              Go to <b>Payroll</b> page to calculate salaries
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              backgroundColor: '#9b59b6',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>3</span>
            <span style={{ color: '#555', fontSize: '15px' }}>
              Delete employees or payroll records anytime
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home