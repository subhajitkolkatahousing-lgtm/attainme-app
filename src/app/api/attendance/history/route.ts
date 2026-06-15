import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const where: any = { employeeId };

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === '12'
        ? `${parseInt(year) + 1}-01-01`
        : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
      where.date = { gte: startDate, lt: endDate };
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: { name: true, empId: true, department: true },
        },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Attendance history error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance history' }, { status: 500 });
  }
}
