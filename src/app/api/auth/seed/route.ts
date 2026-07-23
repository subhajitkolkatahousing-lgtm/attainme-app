import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // === Run Migrations First ===
    const migrationResults: string[] = [];

    // Add bank detail columns if they don't exist
    const bankColumns = ['bankAccount', 'bankIfsc', 'bankName', 'panNumber'];
    for (const col of bankColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`);
        migrationResults.push(`${col} column added/verified`);
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          migrationResults.push(`${col} column already exists`);
        } else {
          migrationResults.push(`${col}: ${e.message}`);
        }
      }
    }

    // Add subRole column if it doesn't exist
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "subRole" TEXT;`);
      migrationResults.push('subRole column added/verified');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        migrationResults.push('subRole column already exists');
      } else {
        migrationResults.push(`subRole: ${e.message}`);
      }
    }

    // Delete dummy/seed employees
    const dummyIds = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'];
    for (const empId of dummyIds) {
      try {
        await db.$executeRawUnsafe(`DELETE FROM "Reimbursement" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "LeaveBalance" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "LeaveApplication" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "Attendance" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "Payroll" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "Employee" WHERE "empId" = '${empId}';`);
        migrationResults.push(`Cleaned up dummy employee ${empId}`);
      } catch (e: any) {
        migrationResults.push(`${empId}: ${e.message}`);
      }
    }

    // === Activate deactivated Super Admin if exists ===
    const deactivatedAdmin = await db.employee.findFirst({
      where: { empId: 'SUADMIN01', active: false }
    });
    if (deactivatedAdmin) {
      await db.employee.update({
        where: { id: deactivatedAdmin.id },
        data: { active: true }
      });
      migrationResults.push('SUADMIN01 re-activated');
    }

    // === Seed Logic ===
    // Check if already seeded
    const existing = await db.employee.findFirst({
      where: { empId: 'SUADMIN01' }
    });
    if (existing) {
      return NextResponse.json({
        message: 'Database already seeded. Migrations applied.',
        migrations: migrationResults
      });
    }

    // Create Super Admin only - no dummy employees
    const superAdmin = await db.employee.create({
      data: {
        empId: 'SUADMIN01', name: 'Super Admin', email: 'matriksaha123@gmail.com',
        phone: null, department: 'Back Office', position: 'Super Administrator',
        salary: 0, role: 'super_admin', password: '#mat3084',
      },
    });

    // Create default Leave Types
    const leaveTypes = await Promise.all([
      db.leaveType.create({ data: { name: 'Casual Leave', description: 'Casual leave for personal work', defaultDays: 12 } }),
      db.leaveType.create({ data: { name: 'Sick Leave', description: 'Leave for medical reasons', defaultDays: 10 } }),
      db.leaveType.create({ data: { name: 'Earned Leave', description: 'Earned/privileged leave', defaultDays: 15 } }),
    ]);

    return NextResponse.json({
      message: 'Database seeded & migrated successfully',
      superAdmin: { empId: superAdmin.empId, name: superAdmin.name },
      leaveTypes: leaveTypes.length,
      migrations: migrationResults,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to seed/migrate the database' });
}
