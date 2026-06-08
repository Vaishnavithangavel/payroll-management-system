import { useState, useEffect } from 'react'
import axios from 'axios'
import AddEmployee from '../components/AddEmployee'
import EmployeeList from '../components/EmployeeList'

function Employees() {
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = () => {
    axios.get('http://localhost:3000/api/employees')
      .then(res => setEmployees(res.data))
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{
        color: '#2c3e50',
        marginBottom: '30px',
        textAlign: 'center',
        fontSize: '36px'
      }}>
        👨‍💼 Employee Management
      </h1>
      <AddEmployee onEmployeeAdded={fetchEmployees} />
      <EmployeeList
        employees={employees}
        onDelete={fetchEmployees}
        onUpdate={fetchEmployees}
      />
    </div>
  )
}

export default Employees