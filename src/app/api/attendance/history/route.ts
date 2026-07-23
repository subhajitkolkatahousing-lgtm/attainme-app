import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Build where clause
    const where: any = {};

    // Filter by employee — "all" means no employeeId filter (for admin/manager)
    if (employeeId !== 'all') {
      where.employeeId = employeeId;
    }

    // Date filter (single date)
    if (date) {
      where.date = date;
    } else if (month && year) {
      // Month + year range filter (legacy support)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === '12'
        ? `${parseInt(year) + 1}-01-01`
        : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
      where.date = { gte: startDate, lt: endDate };
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Exclude dummy seed employees from "all" queries
    if (employeeId === 'all') {
      const dummyIds = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'];
      where.employee = { empId: { notIn: dummyIds } };
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: { name: true, empId: true, department: true, position: true },
        },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Attendance history error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance history' }, { status: 500 });
  }
}
