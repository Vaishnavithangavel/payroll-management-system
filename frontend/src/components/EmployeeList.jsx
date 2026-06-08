import { useState } from 'react'
import axios from 'axios'

function EmployeeList({ employees, onDelete, onUpdate }) {
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editSalary, setEditSalary] = useState('')

  const deleteEmployee = (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      axios.delete(`http://localhost:3000/api/employees/${id}`)
        .then(() => onDelete())
    }
  }

  const startEdit = (emp) => {
    setEditId(emp.id)
    setEditName(emp.name)
    setEditDepartment(emp.department)
    setEditSalary(emp.base_salary)
  }

  const saveEdit = () => {
    axios.put(`http://localhost:3000/api/employees/${editId}`, {
      name: editName,
      department: editDepartment,
      base_salary: editSalary
    }).then(() => {
      setEditId(null)
      onUpdate()
    })
  }

  const inputStyle = {
    padding: '8px 12px',
    border: '2px solid #3498db',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box'
  }

  return (
    <div style={{
      background: 'white',
      padding: '30px',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px', textAlign: 'center' }}>
        👨‍💼 Employees List
      </h2>

      {employees.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#aaa',
          fontSize: '16px'
        }}>
          No employees found. Add one above! 👆
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #2c3e50, #3498db)',
              color: 'white'
            }}>
              <th style={{ padding: '14px', textAlign: 'center' }}>ID</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Name</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Department</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Base Salary</th>
              <th style={{ padding: '14px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={{
                borderBottom: '1px solid #eee',
                backgroundColor: editId === emp.id ? '#f0f7ff' : 'white'
              }}>
                <td style={{ padding: '14px', textAlign: 'center' }}>
                  {emp.id}
                </td>

                <td style={{ padding: '14px', textAlign: 'center' }}>
                  {editId === emp.id ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={inputStyle}
                    />
                  ) : (
                    <span style={{ fontWeight: '500' }}>👤 {emp.name}</span>
                  )}
                </td>

                <td style={{ padding: '14px', textAlign: 'center' }}>
                  {editId === emp.id ? (
                    <select
                      value={editDepartment}
                      onChange={e => setEditDepartment(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="HR">HR</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                    </select>
                  ) : (
                    <span style={{
                      backgroundColor: '#e8f4fd',
                      color: '#3498db',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {emp.department}
                    </span>
                  )}
                </td>

                <td style={{ padding: '14px', textAlign: 'center' }}>
                  {editId === emp.id ? (
                    <input
                      value={editSalary}
                      onChange={e => setEditSalary(e.target.value)}
                      type="number"
                      style={inputStyle}
                    />
                  ) : (
                    <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                      ₹{parseFloat(emp.base_salary).toLocaleString()}
                    </span>
                  )}
                </td>

                <td style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {editId === emp.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{
                            backgroundColor: '#2ecc71',
                            color: 'white',
                            padding: '7px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          ✅ Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          style={{
                            backgroundColor: '#95a5a6',
                            color: 'white',
                            padding: '7px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(emp)}
                          style={{
                            backgroundColor: '#f39c12',
                            color: 'white',
                            padding: '7px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteEmployee(emp.id)}
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
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default EmployeeList