import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { month, year, employeeId } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // Get employees to generate payroll for
    const employees = employeeId
      ? await db.employee.findMany({ where: { id: employeeId, active: true } })
      : await db.employee.findMany({ where: { active: true } });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 404 });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === '12'
      ? `${parseInt(year) + 1}-01-01`
      : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;

    const results = [];

    for (const emp of employees) {
      // Check if payroll already exists
      const existing = await db.payroll.findUnique({
        where: { employeeId_month_year: { employeeId: emp.id, month, year } },
      });

      if (existing) {
        results.push({ empId: emp.empId, name: emp.name, status: 'already_exists' });
        continue;
      }

      // Calculate attendance for the month
      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: startDate, lt: endDate },
          status: 'checked-out',
        },
      });

      const presentDays = attendanceRecords.length;
      const totalWorkHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const overtimeHours = Math.max(0, totalWorkHours - presentDays * 8);

      // Calculate working days in the month (excluding Sundays)
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month - 1, d).getDay();
        if (day !== 0) workingDays++;
      }

      const perDaySalary = emp.salary / workingDays;
      const overtimeRate = perDaySalary / 8 * 1.5;
      const overtime = Math.round(overtimeHours * overtimeRate);
      const deductions = Math.round((workingDays - presentDays) * perDaySalary);
      const bonus = 0;
      const netSalary = Math.round(emp.salary + overtime - deductions + bonus);

      const payroll = await db.payroll.create({
        data: {
          employeeId: emp.id,
          month,
          year,
          basicSalary: emp.salary,
          workingDays,
          presentDays,
          overtime,
          deductions,
          bonus,
          netSalary,
          status: 'pending',
        },
      });

      results.push({
        empId: emp.empId,
        name: emp.name,
        payrollId: payroll.id,
        netSalary: payroll.netSalary,
        status: 'generated',
      });
    }

    return NextResponse.json({
      message: `Payroll generated for ${results.filter(r => r.status === 'generated').length} employees`,
      results,
    }, { status: 201 });
  } catch (error) {
    console.error('Generate payroll error:', error);
    return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
  }
}
