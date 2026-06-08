const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'payroll_db'
});

db.connect((err) => {
  if (err) {
    console.log('MySQL connection failed:', err);
  } else {
    console.log('MySQL connected successfully!');
  }
});

// ✅ GET all employees
app.get('/api/employees', (req, res) => {
  db.query('SELECT * FROM employees', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ✅ POST add employee
app.post('/api/employees', (req, res) => {
  const { name, department, base_salary } = req.body;
  db.query(
    'INSERT INTO employees (name, department, base_salary) VALUES (?, ?, ?)',
    [name, department, base_salary],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Employee added!', id: result.insertId });
    }
  );
});

// ✅ PUT update employee
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, base_salary } = req.body;
  db.query(
    'UPDATE employees SET name=?, department=?, base_salary=? WHERE id=?',
    [name, department, base_salary, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Employee updated!' });
    }
  );
});

// ✅ DELETE employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'DELETE FROM payroll_records WHERE employee_id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json(err);
      db.query(
        'DELETE FROM employees WHERE id = ?',
        [id],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Employee deleted!' });
        }
      );
    }
  );
});

// ✅ GET all payroll records
app.get('/api/payroll', (req, res) => {
  db.query(
    `SELECT p.id, e.name, p.month, p.basic_salary,
     p.allowance, p.deduction, p.net_salary
     FROM payroll_records p
     JOIN employees e ON p.employee_id = e.id`,
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// ✅ POST calculate and save payroll
app.post('/api/payroll', (req, res) => {
  const { employee_id, month, allowance, deduction } = req.body;
  db.query(
    'SELECT base_salary FROM employees WHERE id = ?',
    [employee_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      const basic_salary = results[0].base_salary;
      const net_salary = parseFloat(basic_salary) +
                         parseFloat(allowance) -
                         parseFloat(deduction);
      db.query(
        `INSERT INTO payroll_records
         (employee_id, month, basic_salary, allowance, deduction, net_salary)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [employee_id, month, basic_salary, allowance, deduction, net_salary],
        (err, result) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Payroll calculated!', net_salary });
        }
      );
    }
  );
});

// ✅ DELETE payroll record
app.delete('/api/payroll/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'DELETE FROM payroll_records WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Payroll record deleted!' });
    }
  );
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});