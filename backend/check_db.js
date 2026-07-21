const db = require("./config/db");

async function check() {
  try {
    console.log("--- EMPLOYEES ---");
    const [employees] = await db.query("SELECT id, name, email, role, password FROM employees");
    console.log(employees);

    console.log("\n--- INTERVIEW QUESTIONS COLUMNS ---");
    const [qCols] = await db.query("DESCRIBE interview_questions");
    console.log(qCols);

    console.log("\n--- INTERVIEWS COLUMNS ---");
    const [iCols] = await db.query("DESCRIBE interviews");
    console.log(iCols);

    console.log("\n--- INTERVIEW ANSWERS COLUMNS ---");
    const [aCols] = await db.query("DESCRIBE interview_answers");
    console.log(aCols);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
