import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const linkStyle = (path) => ({
    color: location.pathname === path ? '#3498db' : 'white',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? '700' : '400',
    padding: '6px 14px',
    borderRadius: '6px',
    background: location.pathname === path ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: '0.2s'
  })

  return (
    <nav style={{
      backgroundColor: '#2c3e50',
      padding: '15px 30px',
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }}>
      <h2 style={{ color: 'white', margin: 0, marginRight: '20px' }}>💰 Payroll System</h2>
      <Link to="/" style={linkStyle('/')}>🏠 Home</Link>
      <Link to="/employees" style={linkStyle('/employees')}>👨‍💼 Employees</Link>
      <Link to="/payroll" style={linkStyle('/payroll')}>💵 Payroll</Link>
      <Link to="/reports" style={linkStyle('/reports')}>📊 Reports</Link>  {/* 🆕 */}
    </nav>
  )
}

export default Navbar