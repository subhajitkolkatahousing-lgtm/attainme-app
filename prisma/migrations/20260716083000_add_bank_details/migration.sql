-- AlterTable: Add bank detail columns to Employee table
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankIfsc" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "panNumber" TEXT;

-- Delete dummy employees that should have been removed
DELETE FROM "Reimbursement" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'));
DELETE FROM "LeaveBalance" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'));
DELETE FROM "LeaveApplication" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'));
DELETE FROM "Attendance" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'));
DELETE FROM "Payroll" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'));
DELETE FROM "Employee" WHERE "empId" IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001');
