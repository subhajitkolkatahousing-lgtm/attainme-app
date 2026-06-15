import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Leave balances for an employee or all employees
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));

    if (employeeId && employeeId !== 'all') {
      const balances = await db.leaveBalance.findMany({
        where: { employeeId, year },
        include: { leaveType: { select: { name: true, defaultDays: true } } },
      });
      return NextResponse.json(balances);
    }

    // All employees - return aggregated
    const balances = await db.leaveBalance.findMany({
      where: { year },
      include: {
        employee: { select: { name: true, empId: true, department: true } },
        leaveType: { select: { name: true, defaultDays: true } },
      },
      orderBy: { employeeId: 'asc' },
    });

    return NextResponse.json(balances);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
