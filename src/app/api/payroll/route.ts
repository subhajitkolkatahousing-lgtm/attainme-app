import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    const payrolls = await db.payroll.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        employee: {
          select: { name: true, empId: true, department: true, position: true },
        },
      },
    });

    return NextResponse.json(payrolls);
  } catch (error) {
    console.error('Get payroll error:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 });
  }
}
