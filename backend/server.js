const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');

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
    if (err) return res.status(500).json({ error: err.message });
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
      if (err) return res.status(500).json({ error: err.message });
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
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Employee updated!' });
    }
  );
});

// ✅ DELETE employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM payroll_records WHERE employee_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query('DELETE FROM employees WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Employee deleted!' });
    });
  });
});

// ✅ GET all payroll records
app.get('/api/payroll', (req, res) => {
  db.query(
    `SELECT p.id, e.name, e.department, p.month, p.basic_salary,
     p.allowance, p.deduction, p.net_salary,
     IFNULL(p.pt, 0) as pt,
     IFNULL(p.ss, 0) as ss,
     IFNULL(p.total_tax, 0) as total_tax
     FROM payroll_records p
     JOIN employees e ON p.employee_id = e.id
     ORDER BY p.id DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ POST calculate and save payroll
app.post('/api/payroll', (req, res) => {
  const { employee_id, month, allowance, deduction } = req.body;

  if (!employee_id || !month) {
    return res.status(400).json({ error: 'employee_id and month are required' });
  }

  db.query('SELECT base_salary FROM employees WHERE id = ?', [employee_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ error: 'Employee not found' });

    const basic_salary = parseFloat(results[0].base_salary);
    const allow = parseFloat(allowance) || 0;
    const deduct = parseFloat(deduction) || 0;
    const gross = basic_salary + allow - deduct;

    // PT slab (India standard)
    let pt = 0;
    if (gross > 20000) pt = 200;
    else if (gross > 15000) pt = 130;
    else if (gross > 10000) pt = 110;

    // SS = 12% of basic salary (PF)
    const ss = Math.round(basic_salary * 0.12);
    const total_tax = pt + ss;
    const net_salary = gross - total_tax;

    db.query(
      `INSERT INTO payroll_records
       (employee_id, month, basic_salary, allowance, deduction, pt, ss, total_tax, net_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, month, basic_salary, allow, deduct, pt, ss, total_tax, net_salary],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Payroll calculated!', net_salary, pt, ss, total_tax });
      }
    );
  });
});

// ✅ DELETE payroll record
app.delete('/api/payroll/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM payroll_records WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Payroll record deleted!' });
  });
});

// ✅ Generate Payslip PDF
app.get('/api/payslip/:payrollId', (req, res) => {
  const { payrollId } = req.params;
  db.query(
    `SELECT p.*, e.name, e.department
     FROM payroll_records p
     JOIN employees e ON p.employee_id = e.id
     WHERE p.id = ?`,
    [payrollId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Not found' });

      const r = results[0];
      const gross = parseFloat(r.basic_salary) + parseFloat(r.allowance) - parseFloat(r.deduction);
      const pt = r.pt || 0;
      const ss = r.ss || 0;
      const net = parseFloat(r.net_salary);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=payslip_${r.name.replace(' ', '_')}_${r.month}.pdf`
      );
      doc.pipe(res);

      // Header
      doc.rect(0, 0, 595, 80).fill('#2c3e50');
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
        .text('PAYROLL SLIP', 50, 25, { align: 'center' });
      doc.fontSize(11).font('Helvetica')
        .text(`Month: ${r.month}`, 50, 52, { align: 'center' });

      doc.fillColor('#000');
      doc.moveDown(3);

      // Employee Info
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50')
        .text('Employee Details', 50, 100);
      doc.moveTo(50, 116).lineTo(545, 116).strokeColor('#3498db').lineWidth(2).stroke();

      doc.fontSize(11).font('Helvetica').fillColor('#333');
      doc.text(`Name:`, 50, 125, { continued: true }).font('Helvetica-Bold').text(`  ${r.name}`);
      doc.font('Helvetica').text(`Department:`, 50, 143, { continued: true }).font('Helvetica-Bold').text(`  ${r.department}`);
      doc.font('Helvetica').text(`Employee ID:`, 50, 161, { continued: true }).font('Helvetica-Bold').text(`  ${r.employee_id}`);

      // Earnings
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text('Earnings', 50, 195);
      doc.moveTo(50, 211).lineTo(545, 211).strokeColor('#2ecc71').lineWidth(2).stroke();

      doc.fontSize(11).font('Helvetica').fillColor('#333');
      const row = (label, val, y, color = '#333') => {
        doc.fillColor('#555').text(label, 60, y);
        doc.fillColor(color).font('Helvetica-Bold').text(val, 400, y, { align: 'right', width: 145 });
        doc.font('Helvetica');
      };

      row('Basic Salary', `Rs. ${parseFloat(r.basic_salary).toLocaleString()}`, 220);
      row('Allowances', `+ Rs. ${parseFloat(r.allowance).toLocaleString()}`, 238, '#2ecc71');
      row('Other Deductions', `- Rs. ${parseFloat(r.deduction).toLocaleString()}`, 256, '#e74c3c');

      doc.moveTo(50, 275).lineTo(545, 275).strokeColor('#ddd').lineWidth(1).stroke();
      row('Gross Salary', `Rs. ${gross.toLocaleString()}`, 282, '#3498db');

      // Tax Deductions
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text('Tax Deductions', 50, 315);
      doc.moveTo(50, 331).lineTo(545, 331).strokeColor('#e74c3c').lineWidth(2).stroke();

      doc.fontSize(11);
      row('Professional Tax (PT)', `- Rs. ${pt.toLocaleString()}`, 340, '#e74c3c');
      row('Social Security / PF (12%)', `- Rs. ${ss.toLocaleString()}`, 358, '#e74c3c');
      row('Total Tax', `- Rs. ${(pt + ss).toLocaleString()}`, 376, '#e74c3c');

      // Net Salary
      doc.rect(40, 400, 515, 55).fill('#2c3e50');
      doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
        .text('NET SALARY', 60, 415);
      doc.fontSize(18)
        .text(`Rs. ${net.toLocaleString()}`, 60, 411, { align: 'right', width: 475 });

      // Footer
      doc.fillColor('#888').fontSize(9).font('Helvetica')
        .text('PT Slab: <=10k: Rs.0 | <=15k: Rs.110 | <=20k: Rs.130 | >20k: Rs.200', 50, 470, { align: 'center' })
        .text('SS = 12% of Basic Salary (Employee PF Contribution)', 50, 483, { align: 'center' })
        .moveDown(0.5)
        .text('This is a system-generated payslip. No signature required.', { align: 'center' });

      doc.end();
    }
  );
});

// ✅ REPORTS — Monthly summary
app.get('/api/reports/monthly', (req, res) => {
  db.query(
    `SELECT
       e.department,
       COUNT(DISTINCT p.employee_id) as employee_count,
       SUM(p.basic_salary + p.allowance - p.deduction) as total_gross,
       SUM(IFNULL(p.pt, 0)) as total_pt,
       SUM(IFNULL(p.ss, 0)) as total_ss,
       SUM(p.net_salary) as total_net
     FROM payroll_records p
     JOIN employees e ON p.employee_id = e.id
     GROUP BY e.department`,
    (err, deptData) => {
      if (err) {
        console.error('Monthly report dept error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      db.query(
        `SELECT
           e.name, e.department, p.month,
           p.basic_salary, p.allowance, p.deduction,
           IFNULL(p.pt, 0) as pt,
           IFNULL(p.ss, 0) as ss,
           p.net_salary
         FROM payroll_records p
         JOIN employees e ON p.employee_id = e.id
         ORDER BY p.id DESC LIMIT 50`,
        (err, records) => {
          if (err) {
            console.error('Monthly report records error:', err.message);
            return res.status(500).json({ error: err.message });
          }

          const summary = records.reduce(
            (acc, r) => {
              acc.totalGross += parseFloat(r.basic_salary) + parseFloat(r.allowance) - parseFloat(r.deduction);
              acc.totalNet += parseFloat(r.net_salary);
              acc.totalPT += parseFloat(r.pt) || 0;
              acc.totalSS += parseFloat(r.ss) || 0;
              acc.count++;
              return acc;
            },
            { totalGross: 0, totalNet: 0, totalPT: 0, totalSS: 0, count: 0 }
          );

          res.json({ summary, byDepartment: deptData, records });
        }
      );
    }
  );
});

// ✅ REPORTS — Annual chart data (FIXED: ORDER BY MIN(p.id) to avoid strict mode error)
app.get('/api/reports/annual', (req, res) => {
  db.query(
    `SELECT
       p.month,
       COUNT(DISTINCT p.employee_id) as employees,
       SUM(p.basic_salary + p.allowance - p.deduction) as total_gross,
       SUM(p.net_salary) as total_net,
       SUM(IFNULL(p.pt, 0)) as total_pt,
       SUM(IFNULL(p.ss, 0)) as total_ss
     FROM payroll_records p
     GROUP BY p.month
     ORDER BY MIN(p.id) ASC`,
    (err, results) => {
      if (err) {
        console.error('Annual report error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});