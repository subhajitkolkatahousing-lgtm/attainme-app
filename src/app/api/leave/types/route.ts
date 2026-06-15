import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all leave types
export async function GET() {
  try {
    const types = await db.leaveType.findMany({
      where: { active: true },
      include: { leaveBalances: true, leaveApplications: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(types);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST create a new leave type
export async function POST(req: Request) {
  try {
    const { name, description, defaultDays } = await req.json();
    if (!name || defaultDays === undefined) {
      return NextResponse.json({ error: 'Name and defaultDays required' }, { status: 400 });
    }

    const leaveType = await db.leaveType.create({
      data: { name, description, defaultDays: parseInt(defaultDays) },
    });

    // Create leave balances for all active employees for current year
    const year = new Date().getFullYear();
    const employees = await db.employee.findMany({ where: { active: true } });

    for (const emp of employees) {
      await db.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: leaveType.id,
            year,
          },
        },
        create: {
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          totalDays: parseInt(defaultDays),
          usedDays: 0,
          year,
        },
        update: {
          totalDays: parseInt(defaultDays),
        },
      });
    }

    return NextResponse.json(leaveType);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE a leave type
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.leaveType.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: 'Leave type deactivated' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
