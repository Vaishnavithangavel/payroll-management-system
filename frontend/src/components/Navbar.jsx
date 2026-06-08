import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{
      backgroundColor: '#2c3e50',
      padding: '15px 30px',
      display: 'flex',
      gap: '30px',
      alignItems: 'center'
    }}>
      <h2 style={{ color: 'white', margin: 0 }}>💰 Payroll System</h2>
      <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
      <Link to="/employees" style={{ color: 'white', textDecoration: 'none' }}>Employees</Link>
      <Link to="/payroll" style={{ color: 'white', textDecoration: 'none' }}>Payroll</Link>
    </nav>
  )
}

export default Navbar