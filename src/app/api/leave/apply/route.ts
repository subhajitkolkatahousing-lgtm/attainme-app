import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Employee applies for leave
export async function POST(req: Request) {
  try {
    const { employeeId, leaveTypeId, startDate, endDate, reason } = await req.json();
    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0) days++; // Exclude Sundays
      current.setDate(current.getDate() + 1);
    }

    if (days === 0) {
      return NextResponse.json({ error: 'No working days in selected period' }, { status: 400 });
    }

    // Check leave balance
    const year = start.getFullYear();
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });

    if (!balance) {
      return NextResponse.json({ error: 'No leave balance found for this type' }, { status: 400 });
    }

    const remaining = balance.totalDays - balance.usedDays;
    if (days > remaining) {
      return NextResponse.json({ error: `Insufficient leave balance. You have ${remaining} days remaining` }, { status: 400 });
    }

    const application = await db.leaveApplication.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
        status: 'pending',
      },
      include: {
        employee: { select: { name: true, empId: true, department: true } },
        leaveType: { select: { name: true } },
      },
    });

    return NextResponse.json(application);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Get leave applications (for admin or employee)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');
    const status = url.searchParams.get('status');

    const where: any = {};
    if (employeeId && employeeId !== 'all') where.employeeId = employeeId;
    if (status) where.status = status;

    const applications = await db.leaveApplication.findMany({
      where,
      include: {
        employee: { select: { name: true, empId: true, department: true, position: true } },
        leaveType: { select: { name: true, defaultDays: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(applications);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
