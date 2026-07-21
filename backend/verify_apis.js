// backend/verify_apis.js
const BASE_URL = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING API INTEGRATION & RBAC SANITY TESTS ===");

  let adminToken = "";
  let employeeToken = "";
  let testEmpId = null;
  let testDeptId = null;
  let testLeaveId = null;

  try {
    // 1. Test Admin Login
    console.log("\n1. Testing Admin Login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@payroll.com",
        password: "adminpassword"
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    adminToken = loginData.token;
    console.log("✅ Admin logged in successfully!");
    console.log("   Role:", loginData.user.role);

    const authHeaders = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}` 
    };

    // 2. Test Fetching Profile
    console.log("\n2. Testing /auth/me profile retrieve (Admin)...");
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: authHeaders
    });
    if (!meRes.ok) throw new Error("Failed to fetch profile");
    const meData = await meRes.json();
    console.log("✅ Profile fetched successfully!");
    console.log("   Name:", meData.name, "| Role:", meData.role);

    // 3. Test Create Department
    console.log("\n3. Testing Creating a Department (Admin)...");
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Temporary Test Dept" })
    });
    if (!deptRes.ok) throw new Error("Failed to create department");
    const deptData = await deptRes.json();
    testDeptId = deptData.id;
    console.log("✅ Department created successfully! ID:", testDeptId);

    // 4. Test Create Employee (with credentials)
    console.log("\n4. Testing Registering Employee (Admin)...");
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "John Test Employee",
        email: "john.test@payroll.com",
        password: "johnpassword123",
        role: "Employee",
        department_id: testDeptId,
        base_salary: 25000
      })
    });
    if (!empRes.ok) {
      const err = await empRes.json();
      throw new Error(`Failed to register employee: ${JSON.stringify(err)}`);
    }
    const empData = await empRes.json();
    testEmpId = empData.id;
    console.log("✅ Employee registered successfully! ID:", testEmpId);

    // 5. Test Employee Login
    console.log("\n5. Testing Employee Login...");
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "john.test@payroll.com",
        password: "johnpassword123"
      })
    });
    if (!empLoginRes.ok) throw new Error("Employee login failed");
    const empLoginData = await empLoginRes.json();
    employeeToken = empLoginData.token;
    console.log("✅ Employee logged in successfully!");

    const empHeaders = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${employeeToken}` 
    };

    // 6. Test Employee Route Protection (Accessing reports should fail)
    console.log("\n6. Testing Route Protection (Employee trying to view Reports)...");
    const repRes = await fetch(`${BASE_URL}/reports/monthly`, {
      headers: empHeaders
    });
    if (repRes.status === 403) {
      console.log("✅ Route Protection PASSED! Received 403 Forbidden.");
    } else {
      console.log("❌ FAILED: Employee was able to access reports or got error code:", repRes.status);
    }

    // 7. Test Apply for Leave (Employee)
    console.log("\n7. Testing Applying for Leave (Employee)...");
    const leaveRes = await fetch(`${BASE_URL}/leaves`, {
      method: "POST",
      headers: empHeaders,
      body: JSON.stringify({
        leave_type: "Casual Leave",
        start_date: "2026-06-15",
        end_date: "2026-06-18",
        reason: "Medical checkup"
      })
    });
    if (!leaveRes.ok) throw new Error("Failed to apply leave");
    const leaveData = await leaveRes.json();
    testLeaveId = leaveData.id;
    console.log("✅ Leave applied successfully! ID:", testLeaveId);

    // 8. Test Approving Leave (Admin)
    console.log("\n8. Testing Approving Leave (Admin)...");
    const approveRes = await fetch(`${BASE_URL}/leaves/${testLeaveId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ status: "Approved" })
    });
    if (!approveRes.ok) throw new Error("Failed to approve leave");
    const approveData = await approveRes.json();
    console.log("✅ Leave approved successfully!");
    console.log("   Message:", approveData.message);

    // 9. Test Employee Notification Feed
    console.log("\n9. Testing Notification Feed (Employee)...");
    const notifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: empHeaders
    });
    if (!notifRes.ok) throw new Error("Failed to fetch notifications");
    const notifData = await notifRes.json();
    console.log("✅ Notifications fetched successfully! Count:", notifData.length);
    console.log("   Latest Message:", notifData[0]?.message);

    // Clean up
    console.log("\n=== CLEANING UP TEST DATA ===");
    const delEmpRes = await fetch(`${BASE_URL}/employees/${testEmpId}`, {
      method: "DELETE",
      headers: authHeaders
    });
    if (delEmpRes.ok) console.log("🧹 Test employee deleted.");
    
    const delDeptRes = await fetch(`${BASE_URL}/departments/${testDeptId}`, {
      method: "DELETE",
      headers: authHeaders
    });
    if (delDeptRes.ok) console.log("🧹 Test department deleted.");

    console.log("\n🎉 ALL RBAC AND API SANITY TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (error) {
    console.error("\n❌ SANITY TESTS FAILED:", error.message);
    
    // Attempt cleanup if IDs exist
    if (adminToken) {
      const authHeaders = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}` 
      };
      if (testEmpId) {
        await fetch(`${BASE_URL}/employees/${testEmpId}`, { method: "DELETE", headers: authHeaders }).catch(() => {});
      }
      if (testDeptId) {
        await fetch(`${BASE_URL}/departments/${testDeptId}`, { method: "DELETE", headers: authHeaders }).catch(() => {});
      }
    }
  }
}

// Ensure the local dev server is running on port 3000 to execute tests!
runTests();
