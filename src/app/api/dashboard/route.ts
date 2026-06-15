import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalEmployees = await db.employee.count({ where: { active: true } });
    const today = new Date().toISOString().split('T')[0];

    const todayAttendance = await db.attendance.findMany({
      where: { date: today },
      include: {
        employee: { select: { name: true, empId: true, department: true } },
      },
    });

    const checkedInCount = todayAttendance.filter(a => a.checkIn).length;
    const checkedOutCount = todayAttendance.filter(a => a.checkOut).length;
    const absentCount = totalEmployees - checkedInCount;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const totalPayroll = await db.payroll.aggregate({
      _sum: { netSalary: true },
      where: { month: currentMonth, year: currentYear },
    });

    const paidPayroll = await db.payroll.aggregate({
      _sum: { netSalary: true },
      where: { month: currentMonth, year: currentYear, status: 'paid' },
    });

    const pendingPayroll = await db.payroll.aggregate({
      _sum: { netSalary: true },
      where: { month: currentMonth, year: currentYear, status: 'pending' },
    });

    // Department-wise stats
    const departments = await db.employee.groupBy({
      by: ['department'],
      where: { active: true },
      _count: { id: true },
    });

    // Recent attendance
    const recentAttendance = await db.attendance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        employee: { select: { name: true, empId: true, department: true } },
      },
    });

    return NextResponse.json({
      totalEmployees,
      todayPresent: checkedInCount,
      todayCheckedOut: checkedOutCount,
      todayAbsent: absentCount,
      monthlyPayroll: totalPayroll._sum.netSalary || 0,
      paidAmount: paidPayroll._sum.netSalary || 0,
      pendingAmount: pendingPayroll._sum.netSalary || 0,
      departments,
      recentAttendance,
      todayAttendance,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
