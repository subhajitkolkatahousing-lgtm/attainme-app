import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalEmployees = await db.employee.count({ where: { active: true, empId: { notIn: ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'] } } });

    const today = new Date().toISOString().split('T')[0];

    const todayAttendance = await db.attendance.findMany({
      where: { date: today },
      include: { employee: { select: { name: true, empId: true, department: true } } },
    });

    // Only count attendance of non-dummy employees
    const dummyIds = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'];
    const validAttendance = todayAttendance.filter(a => a.employee && !dummyIds.includes(a.employee.empId));
    const todayPresent = validAttendance.filter(a => a.checkIn && a.status !== 'rejected').length;
    const todayCheckedOut = validAttendance.filter(a => a.checkOut && a.status === 'approved').length;
    const todayAbsent = totalEmployees - todayPresent;
    const pendingCount = todayAttendance.filter(a => a.status === 'pending').length;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyPayrolls = await db.payroll.findMany({
      where: { month: currentMonth, year: currentYear },
    });

    const monthlyPayroll = monthlyPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const paidAmount = monthlyPayrolls.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.netSalary, 0);
    const pendingAmount = monthlyPayroll - paidAmount;

    const departments = await db.employee.groupBy({
      by: ['department'],
      where: { active: true, empId: { notIn: ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'] } },
      _count: { id: true },
    });

    const recentAttendance = await db.attendance.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { name: true, empId: true, department: true } } },
    });

    // Pending leave applications count
    const pendingLeaves = await db.leaveApplication.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({
      totalEmployees,
      todayPresent,
      todayCheckedOut,
      todayAbsent,
      pendingCount,
      monthlyPayroll,
      paidAmount,
      pendingAmount,
      departments,
      recentAttendance,
      todayAttendance,
      pendingLeaves,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
