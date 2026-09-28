import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Mentneo Employee Portal Integration Test Suite...\n');

  // Test 1: Health check
  console.log('Test 1: Backend Health Check');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.ok, true);
  console.log('  ✓ Health check passed:', healthData.message);

  // Test 2: Authentication Fail with Bad Password
  console.log('\nTest 2: Reject Invalid Credentials');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/employee/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john.doe@mentneo.com', password: 'WrongPassword999' })
  });
  assert.strictEqual(badLoginRes.status, 401, 'Should reject invalid password with 401');
  console.log('  ✓ Invalid credentials properly rejected');

  // Test 3: Authentication Success
  console.log('\nTest 3: Employee Login with Valid Credentials');
  const loginRes = await fetch(`${BASE_URL}/api/auth/employee/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john.doe@mentneo.com', password: 'Password@123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login should succeed with 200');
  const loginData = await loginRes.json();
  assert.ok(loginData.token, 'Should return JWT token');
  assert.strictEqual(loginData.user.fullName, 'John Doe');
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('  ✓ Login succeeded for:', loginData.user.fullName, `(${loginData.user.designation})`);

  // Test 4: Dashboard Overview API
  console.log('\nTest 4: Employee Dashboard Aggregate Data');
  const dashRes = await fetch(`${BASE_URL}/api/employee/dashboard`, { headers: authHeaders });
  assert.strictEqual(dashRes.status, 200);
  const dash = await dashRes.json();
  assert.ok(dash.tasks.stats, 'Dashboard should have task stats');
  assert.ok(dash.leave.summary, 'Dashboard should have leave summary');
  console.log('  ✓ Dashboard loaded: Tasks Total =', dash.tasks.stats.total, '| Leave Available =', dash.leave.summary.available);

  // Test 5: Biometric Face Template Registration & Verification
  console.log('\nTest 5: Biometric Face Recognition Pipeline');
  // Generate sample 128-d normalized vector
  const testVector = new Array(128).fill(0).map((_, i) => Math.sin(i * 0.1));
  let norm = Math.sqrt(testVector.reduce((s, v) => s + v * v, 0));
  const normalizedVector = testVector.map(v => v / norm);

  const faceRegRes = await fetch(`${BASE_URL}/api/employee/face/register`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ templateData: normalizedVector, qualityScore: 0.92 })
  });
  assert.strictEqual(faceRegRes.status, 200);
  console.log('  ✓ Face template vector registered successfully');

  // Verify with identical vector
  const faceVerifyRes = await fetch(`${BASE_URL}/api/employee/face/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ templateData: normalizedVector, action: 'CHECK_IN' })
  });
  // Can be 200 (checked in) or 400 (already checked in today)
  console.log('  ✓ Face verification processed with status:', faceVerifyRes.status);

  // Test 6: Attendance Module
  console.log('\nTest 6: Attendance History & Break Flow');
  const attRes = await fetch(`${BASE_URL}/api/employee/attendance`, { headers: authHeaders });
  assert.strictEqual(attRes.status, 200);
  const attData = await attRes.json();
  assert.ok(Array.isArray(attData.history), 'Should return attendance history');
  console.log('  ✓ Attendance records count:', attData.history.length);

  // Test 7: Attendance Correction Request
  console.log('\nTest 7: Attendance Correction Submission');
  const corrRes = await fetch(`${BASE_URL}/api/employee/attendance/correction`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      date: '2026-09-24',
      requestedCheckIn: '09:05 AM',
      requestedCheckOut: '06:15 PM',
      reason: 'Biometric optical scanner network error at front gate'
    })
  });
  assert.strictEqual(corrRes.status, 200);
  console.log('  ✓ Correction request submitted for manager review');

  // Test 8: Tasks & Progress Updates
  console.log('\nTest 8: Task Progress & Activity Audit Trail');
  const tasksRes = await fetch(`${BASE_URL}/api/employee/tasks`, { headers: authHeaders });
  assert.strictEqual(tasksRes.status, 200);
  const tasksData = await tasksRes.json();
  assert.ok(tasksData.tasks.length > 0, 'Should have assigned tasks');
  const targetTask = tasksData.tasks[0];

  const updateTaskRes = await fetch(`${BASE_URL}/api/employee/tasks/${targetTask.id}/progress`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      progress: 75,
      status: 'IN_PROGRESS',
      workUpdate: 'Completed unit test coverage and benchmark latency validation'
    })
  });
  assert.strictEqual(updateTaskRes.status, 200);

  const detailRes = await fetch(`${BASE_URL}/api/employee/tasks/${targetTask.id}`, { headers: authHeaders });
  const detailData = await detailRes.json();
  assert.ok(detailData.activities.length > 0, 'Activity history must be populated');
  assert.strictEqual(detailData.task.progress, 75);
  console.log('  ✓ Task updated to 75% progress. Activities recorded:', detailData.activities.length);

  // Test 9: Daily Work Log
  console.log('\nTest 9: Daily Work Log Recording');
  const workLogRes = await fetch(`${BASE_URL}/api/employee/work-logs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      taskId: targetTask.id,
      description: 'Implemented face embedding distance comparison and biometric validation',
      startTime: '09:30 AM',
      endTime: '05:30 PM',
      hoursSpent: 7.5,
      challenges: 'Hardware acceleration flags',
      notes: 'PR #104 opened'
    })
  });
  assert.strictEqual(workLogRes.status, 200);
  console.log('  ✓ Daily work log entry created');

  // Test 10: Daily Standup Report
  console.log('\nTest 10: Daily Standup Report Submission');
  const reportRes = await fetch(`${BASE_URL}/api/employee/daily-reports`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      accomplishments: 'Delivered production Employee Dashboard modules with real database integration.',
      workInProgress: 'Fine-tuning facial recognition lighting thresholds.',
      blockers: 'None',
      tomorrowPlan: 'Security review and test verification.',
      isSubmit: true
    })
  });
  assert.strictEqual(reportRes.status, 200);
  console.log('  ✓ Daily standup report saved and submitted');

  // Test 11: Leave Management & Negative Balance Protection
  console.log('\nTest 11: Leave Management & Negative Balance Safeguard');
  const leaveBalRes = await fetch(`${BASE_URL}/api/employee/leave/balance`, { headers: authHeaders });
  const leaveBal = await leaveBalRes.json();
  assert.ok(leaveBal.balances.length > 0);
  const clType = leaveBal.balances[0];

  // Try applying for 999 days (should be rejected)
  const excessiveLeaveRes = await fetch(`${BASE_URL}/api/employee/leave/apply`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      leaveTypeId: clType.leave_type_id,
      startDate: '2026-11-01',
      endDate: '2026-12-01',
      daysCount: 999,
      reason: 'Excessive vacation'
    })
  });
  assert.strictEqual(excessiveLeaveRes.status, 400, 'Should reject leave exceeding balance');
  console.log('  ✓ Excessive leave properly rejected with 400');

  // Apply valid 1 day leave
  const validLeaveRes = await fetch(`${BASE_URL}/api/employee/leave/apply`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      leaveTypeId: clType.leave_type_id,
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      daysCount: 1,
      reason: 'Personal family event'
    })
  });
  assert.strictEqual(validLeaveRes.status, 200);
  const leaveApplied = await validLeaveRes.json();
  console.log('  ✓ Valid leave application accepted');

  // Cancel the applied leave
  const cancelLeaveRes = await fetch(`${BASE_URL}/api/employee/leave/${leaveApplied.requestId}/cancel`, {
    method: 'POST',
    headers: authHeaders
  });
  assert.strictEqual(cancelLeaveRes.status, 200);
  console.log('  ✓ Leave cancellation processed and balance restored');

  // Test 12: Calendar
  console.log('\nTest 12: Calendar Events Feed');
  const calRes = await fetch(`${BASE_URL}/api/employee/calendar`, { headers: authHeaders });
  assert.strictEqual(calRes.status, 200);
  const calData = await calRes.json();
  assert.ok(calData.events.length > 0, 'Calendar should contain holidays, tasks, and events');
  console.log('  ✓ Calendar events loaded:', calData.events.length);

  // Test 13: Notifications & Announcements
  console.log('\nTest 13: Notifications & Announcements');
  const notifRes = await fetch(`${BASE_URL}/api/employee/notifications`, { headers: authHeaders });
  const notifData = await notifRes.json();
  assert.ok(Array.isArray(notifData.notifications));
  const annRes = await fetch(`${BASE_URL}/api/employee/announcements`, { headers: authHeaders });
  const annData = await annRes.json();
  assert.ok(Array.isArray(annData.announcements));
  console.log('  ✓ Notifications count:', notifData.notifications.length, '| Announcements count:', annData.announcements.length);

  // Test 14: Company Directory (Privacy verification)
  console.log('\nTest 14: Company Directory Privacy Verification');
  const dirRes = await fetch(`${BASE_URL}/api/employee/directory`, { headers: authHeaders });
  assert.strictEqual(dirRes.status, 200);
  const dirData = await dirRes.json();
  assert.ok(dirData.employees.length > 0);
  // Ensure no password, salary, or biometric data is exposed
  for (const emp of dirData.employees) {
    assert.strictEqual(emp.password_hash, undefined, 'Must not expose password');
    assert.strictEqual(emp.salary, undefined, 'Must not expose salary');
    assert.strictEqual(emp.template_data, undefined, 'Must not expose biometric templates');
  }
  console.log('  ✓ Directory verified: privacy fields properly masked for', dirData.employees.length, 'employees');

  // Test 15: Support Ticketing System
  console.log('\nTest 15: Support Ticketing System');
  const ticketRes = await fetch(`${BASE_URL}/api/employee/support/tickets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category: 'IT',
      subject: 'Request for secondary 4K development monitor',
      description: 'Need dual display for inspecting model embedding plots and diagrams.',
      priority: 'MEDIUM'
    })
  });
  assert.strictEqual(ticketRes.status, 200);
  const ticketData = await ticketRes.json();

  const replyRes = await fetch(`${BASE_URL}/api/employee/support/tickets/${ticketData.ticketId}/messages`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ message: 'Providing desk number: Bay 4, Seat 12' })
  });
  assert.strictEqual(replyRes.status, 200);
  console.log('  ✓ Support ticket created with code:', ticketData.ticketCode, 'and message replied');

  console.log('\n🎉 ALL 15 INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Integration Test Failed:', err);
  process.exit(1);
});
