require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const db = require("./config/db");
const bcrypt = require("bcryptjs");

const app = express();  // ✅ FIRST define app

app.use(cors());
app.use(express.json());

// ✅ Then import routes
const authRoutes = require('./routes/authRoutes');      // JWT auth (new)
const uploadDocRoute = require("./routes/uploadDoc");
const askDocRoute = require("./routes/askDoc");
const authRoute = require("./routes/auth");             // existing auth
const departmentRoute = require("./routes/departments");
const leaveRoute = require("./routes/leaves");
const attendanceRoute = require("./routes/attendance");
const notificationRoute = require("./routes/notifications");
const interviewRoute = require("./routes/interview");

const { authenticateToken, requireRoles } = require("./middleware/auth");

// ✅ Register routes
app.use('/api/auth', authRoutes);         // NEW: JWT login route
app.use("/api", authRoute);
app.use("/api", departmentRoute);
app.use("/api", leaveRoute);
app.use("/api", attendanceRoute);
app.use("/api", notificationRoute);
app.use("/api", uploadDocRoute);
app.use("/api", askDocRoute);
app.use("/api/interview", interviewRoute);

// ✅ GET all employees (RBAC scoped)
app.get('/api/employees', authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;
  try {
    let query = 'SELECT id, name, department, base_salary, email, role, department_id, created_at FROM employees';
    let params = [];
    if (role === 'Employee') {
      query += ' WHERE id = ?';
      params.push(userId);
    } else if (role === 'HOD') {
      query += ' WHERE department_id = ?';
      params.push(deptId);
    }
    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST add employee (Admin / HR Manager only)
app.post('/api/employees', authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { name, email, password, role, department_id, base_salary } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    let departmentName = "";
    if (department_id) {
      const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
      if (deptRows.length > 0) departmentName = deptRows[0].name;
    }

    const [result] = await db.query(
      'INSERT INTO employees (name, email, password, role, department_id, department, base_salary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'Employee', department_id || null, departmentName, base_salary || 0]
    );

    const message = `Welcome ${name}! Your payroll account has been successfully created. Your login email is ${email}.`;
    await db.query('INSERT INTO notifications (employee_id, message) VALUES (?, ?)', [result.insertId, message]);

    res.json({ message: 'Employee added!', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT update employee (Admin / HR Manager only)
app.put('/api/employees/:id', authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, department_id, base_salary } = req.body;
  try {
    const [empRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (empRows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = empRows[0];

    let departmentName = emp.department;
    if (department_id && department_id !== emp.department_id) {
      const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
      if (deptRows.length > 0) departmentName = deptRows[0].name;
    }

    let query = 'UPDATE employees SET name=?, email=?, role=?, department_id=?, department=?, base_salary=?';
    let params = [name, email, role || emp.role, department_id || null, departmentName, base_salary];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password=?';
      params.push(hashedPassword);
    }

    query += ' WHERE id=?';
    params.push(id);

    await db.query(query, params);
    res.json({ message: 'Employee updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE employee (Admin / HR Manager only)
app.delete('/api/employees/:id', authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM payroll_records WHERE employee_id = ?', [id]);
    await db.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Employee deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET all payroll records (RBAC scoped)
app.get('/api/payroll', authenticateToken, async (req, res) => {
  const { role, id: userId, department_id: deptId } = req.user;
  try {
    let query = `
      SELECT p.id, e.name, e.department, p.month, p.basic_salary,
      p.allowance, p.deduction, p.net_salary,
      IFNULL(p.pt, 0) as pt,
      IFNULL(p.ss, 0) as ss,
      IFNULL(p.total_tax, 0) as total_tax,
      p.employee_id
      FROM payroll_records p
      JOIN employees e ON p.employee_id = e.id
    `;
    let params = [];
    if (role === 'Employee') {
      query += ' WHERE p.employee_id = ?';
      params.push(userId);
    } else if (role === 'HOD') {
      query += ' WHERE e.department_id = ?';
      params.push(deptId);
    }
    query += ' ORDER BY p.id DESC';
    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST calculate and save payroll (Admin / HR Manager only)
app.post('/api/payroll', authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { employee_id, month, allowance, deduction } = req.body;
  if (!employee_id || !month) {
    return res.status(400).json({ error: 'employee_id and month are required' });
  }
  try {
    const [results] = await db.query('SELECT base_salary FROM employees WHERE id = ?', [employee_id]);
    if (!results.length) return res.status(404).json({ error: 'Employee not found' });

    const basic_salary = parseFloat(results[0].base_salary);
    const allow = parseFloat(allowance) || 0;
    const deduct = parseFloat(deduction) || 0;
    const gross = basic_salary + allow - deduct;

    let pt = 0;
    if (gross > 20000) pt = 200;
    else if (gross > 15000) pt = 130;
    else if (gross > 10000) pt = 110;

    const ss = Math.round(basic_salary * 0.12);
    const total_tax = pt + ss;
    const net_salary = gross - total_tax;

    await db.query(
      `INSERT INTO payroll_records
       (employee_id, month, basic_salary, allowance, deduction, pt, ss, total_tax, net_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, month, basic_salary, allow, deduct, pt, ss, total_tax, net_salary]
    );

    const notifyMsg = `Your payroll for the month of ${month} has been generated. Net Salary: ₹${net_salary.toLocaleString()}.`;
    await db.query('INSERT INTO notifications (employee_id, message) VALUES (?, ?)', [employee_id, notifyMsg]);

    res.json({ message: 'Payroll calculated!', net_salary, pt, ss, total_tax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE payroll record (Admin / HR Manager only)
app.delete('/api/payroll/:id', authenticateToken, requireRoles(["Admin", "HR Manager"]), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM payroll_records WHERE id = ?', [id]);
    res.json({ message: 'Payroll record deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Generate Payslip PDF (RBAC Scoped)
app.get('/api/payslip/:payrollId', authenticateToken, async (req, res) => {
  const { payrollId } = req.params;
  const { role, id: userId, department_id: deptId } = req.user;

  try {
    const [results] = await db.query(
      `SELECT p.*, e.name, e.department, e.department_id
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = ?`,
      [payrollId]
    );

    if (results.length === 0) return res.status(404).json({ error: 'Not found' });

    const r = results[0];

    if (role === 'Employee' && r.employee_id !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only download your own payslip.' });
    } else if (role === 'HOD' && r.department_id !== deptId) {
      return res.status(403).json({ error: 'Access denied. HOD can only view department employee payslips.' });
    }

    const gross = parseFloat(r.basic_salary) + parseFloat(r.allowance) - parseFloat(r.deduction);
    const pt = r.pt || 0;
    const ss = r.ss || 0;
    const net = parseFloat(r.net_salary);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename=payslip_${r.name.replace(' ', '_')}_${r.month}.pdf`
    );
    doc.pipe(res);

    doc.rect(0, 0, 595, 80).fill('#2c3e50');
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('PAYROLL SLIP', 50, 25, { align: 'center' });
    doc.fontSize(11).font('Helvetica')
      .text(`Month: ${r.month}`, 50, 52, { align: 'center' });

    doc.fillColor('#000').moveDown(3);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text('Employee Details', 50, 100);
    doc.moveTo(50, 116).lineTo(545, 116).strokeColor('#3498db').lineWidth(2).stroke();

    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Name:`, 50, 125, { continued: true }).font('Helvetica-Bold').text(`  ${r.name}`);
    doc.font('Helvetica').text(`Department:`, 50, 143, { continued: true }).font('Helvetica-Bold').text(`  ${r.department}`);
    doc.font('Helvetica').text(`Employee ID:`, 50, 161, { continued: true }).font('Helvetica-Bold').text(`  ${r.employee_id}`);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text('Earnings', 50, 195);
    doc.moveTo(50, 211).lineTo(545, 211).strokeColor('#2ecc71').lineWidth(2).stroke();

    const row = (label, val, y, color = '#333') => {
      doc.fillColor('#555').font('Helvetica').text(label, 60, y);
      doc.fillColor(color).font('Helvetica-Bold').text(val, 400, y, { align: 'right', width: 145 });
    };

    row('Basic Salary', `Rs. ${parseFloat(r.basic_salary).toLocaleString()}`, 220);
    row('Allowances', `+ Rs. ${parseFloat(r.allowance).toLocaleString()}`, 238, '#2ecc71');
    row('Other Deductions', `- Rs. ${parseFloat(r.deduction).toLocaleString()}`, 256, '#e74c3c');
    doc.moveTo(50, 275).lineTo(545, 275).strokeColor('#ddd').lineWidth(1).stroke();
    row('Gross Salary', `Rs. ${gross.toLocaleString()}`, 282, '#3498db');

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text('Tax Deductions', 50, 315);
    doc.moveTo(50, 331).lineTo(545, 331).strokeColor('#e74c3c').lineWidth(2).stroke();

    row('Professional Tax (PT)', `- Rs. ${pt.toLocaleString()}`, 340, '#e74c3c');
    row('Social Security / PF (12%)', `- Rs. ${ss.toLocaleString()}`, 358, '#e74c3c');
    row('Total Tax', `- Rs. ${(pt + ss).toLocaleString()}`, 376, '#e74c3c');

    doc.rect(40, 400, 515, 55).fill('#2c3e50');
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold').text('NET SALARY', 60, 415);
    doc.fontSize(18).text(`Rs. ${net.toLocaleString()}`, 60, 411, { align: 'right', width: 475 });

    doc.fillColor('#888').fontSize(9).font('Helvetica')
      .text('PT Slab: <=10k: Rs.0 | <=15k: Rs.110 | <=20k: Rs.130 | >20k: Rs.200', 50, 470, { align: 'center' })
      .text('SS = 12% of Basic Salary (Employee PF Contribution)', 50, 483, { align: 'center' })
      .moveDown(0.5)
      .text('This is a system-generated payslip. No signature required.', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ REPORTS — Monthly summary (scoped)
app.get('/api/reports/monthly', authenticateToken, requireRoles(["Admin", "HR Manager", "HOD"]), async (req, res) => {
  const { role, department_id: deptId } = req.user;
  try {
    let deptFilter = "";
    let deptParams = [];
    if (role === 'HOD') {
      deptFilter = " WHERE e.department_id = ? ";
      deptParams.push(deptId);
    }

    const [deptData] = await db.query(
      `SELECT e.department,
         COUNT(DISTINCT p.employee_id) as employee_count,
         SUM(p.basic_salary + p.allowance - p.deduction) as total_gross,
         SUM(IFNULL(p.pt, 0)) as total_pt,
         SUM(IFNULL(p.ss, 0)) as total_ss,
         SUM(p.net_salary) as total_net
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       ${deptFilter}
       GROUP BY e.department`,
      deptParams
    );

    const [records] = await db.query(
      `SELECT e.name, e.department, p.month,
         p.basic_salary, p.allowance, p.deduction,
         IFNULL(p.pt, 0) as pt,
         IFNULL(p.ss, 0) as ss,
         p.net_salary
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       ${deptFilter}
       ORDER BY p.id DESC LIMIT 50`,
      deptParams
    );

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ REPORTS — Annual chart data (scoped)
app.get('/api/reports/annual', authenticateToken, requireRoles(["Admin", "HR Manager", "HOD"]), async (req, res) => {
  const { role, department_id: deptId } = req.user;
  try {
    let deptFilter = "";
    let deptParams = [];
    if (role === 'HOD') {
      deptFilter = " WHERE e.department_id = ? ";
      deptParams.push(deptId);
    }

    const [results] = await db.query(
      `SELECT p.month,
         COUNT(DISTINCT p.employee_id) as employees,
         SUM(p.basic_salary + p.allowance - p.deduction) as total_gross,
         SUM(p.net_salary) as total_net,
         SUM(IFNULL(p.pt, 0)) as total_pt,
         SUM(IFNULL(p.ss, 0)) as total_ss
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       ${deptFilter}
       GROUP BY p.month
       ORDER BY MIN(p.id) ASC`,
      deptParams
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});