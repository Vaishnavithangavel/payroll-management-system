import { useState } from 'react'
import axios from 'axios'

function AddEmployee({ onEmployeeAdded }) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [salary, setSalary] = useState('')

  const addEmployee = () => {
    if (!name || !department || !salary) {
      alert('Please fill all fields!')
      return
    }
    axios.post('http://localhost:3000/api/employees', {
      name,
      department,
      base_salary: salary
    }).then(() => {
      onEmployeeAdded()
      setName('')
      setDepartment('')
      setSalary('')
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
    <div style={{
      background: 'white',
      padding: '30px',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      marginBottom: '30px'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px', textAlign: 'center' }}>
        ➕ Add New Employee
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr auto',
        gap: '15px',
        alignItems: 'center'
      }}>
        <input
          placeholder="👤 Employee Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          style={inputStyle}
        >
          <option value="">🏢 Select Department</option>
          <option value="HR">HR</option>
          <option value="Engineering">Engineering</option>
          <option value="Finance">Finance</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
          <option value="Operations">Operations</option>
        </select>
        <input
          placeholder="💰 Base Salary"
          value={salary}
          onChange={e => setSalary(e.target.value)}
          type="number"
          style={inputStyle}
        />
        <button
          onClick={addEmployee}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          + Add Employee
        </button>
      </div>
    </div>
  )
}

export default AddEmployee