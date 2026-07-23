import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const results: string[] = [];

    // Add subRole column if it doesn't exist
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "subRole" TEXT;`);
      results.push('subRole column added/verified');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        results.push(`subRole: ${e.message}`);
      } else {
        results.push('subRole column already exists');
      }
    }

    // Add bank detail columns
    const bankColumns = ['bankAccount', 'bankIfsc', 'bankName', 'panNumber'];
    for (const col of bankColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`);
        results.push(`${col} column added/verified`);
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          results.push(`${col}: ${e.message}`);
        } else {
          results.push(`${col} column already exists`);
        }
      }
    }

    // Delete dummy/seed employees
    const dummyIds = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'];
    for (const empId of dummyIds) {
      try {
        // Delete related records first (cascade)
        await db.$executeRawUnsafe(`DELETE FROM "Attendance" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "Leave" WHERE "employeeId" IN (SELECT id FROM "Employee" WHERE "empId" = '${empId}');`);
        await db.$executeRawUnsafe(`DELETE FROM "Employee" WHERE "empId" = '${empId}';`);
        results.push(`Deleted dummy employee ${empId}`);
      } catch (e: any) {
        results.push(`${empId}: ${e.message}`);
      }
    }

    return NextResponse.json({ message: 'Migration completed', results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Migration endpoint is ready. Use POST to run migrations.' });
}
