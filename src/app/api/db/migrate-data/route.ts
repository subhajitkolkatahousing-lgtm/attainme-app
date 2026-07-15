import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Update Super Admin credentials
    const sa = await db.employee.findUnique({ where: { empId: 'SUADMIN01' } });
    if (sa) {
      await db.employee.update({
        where: { id: sa.id },
        data: {
          email: 'matriksaha123@gmail.com',
          password: '#mat3084',
          department: 'Back Office',
          name: 'Super Admin',
        },
      });
    }

    // Delete all dummy employees (EMP001-EMP005, ADMIN001, MGR001)
    const dummyEmpIds = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'ADMIN001', 'MGR001'];
    for (const empId of dummyEmpIds) {
      const emp = await db.employee.findUnique({ where: { empId } });
      if (emp) {
        // Delete related records first
        await db.leaveBalance.deleteMany({ where: { employeeId: emp.id } });
        await db.leaveApplication.deleteMany({ where: { employeeId: emp.id } });
        await db.attendance.deleteMany({ where: { employeeId: emp.id } });
        await db.payroll.deleteMany({ where: { employeeId: emp.id } });
        await db.reimbursement.deleteMany({ where: { employeeId: emp.id } });
        await db.employee.delete({ where: { id: emp.id } });
      }
    }

    // Set subRole for remaining employees without one
    const employees = await db.employee.findMany({ where: { role: 'employee', subRole: null } });
    for (const emp of employees) {
      await db.employee.update({
        where: { id: emp.id },
        data: { subRole: 'sales' },
      });
    }

    // Ensure default leave types exist
    const existingTypes = await db.leaveType.findMany();
    if (existingTypes.length === 0) {
      await db.leaveType.createMany({
        data: [
          { name: 'Casual Leave', description: 'Casual leave for personal work', defaultDays: 12 },
          { name: 'Sick Leave', description: 'Leave for medical reasons', defaultDays: 10 },
          { name: 'Earned Leave', description: 'Earned/privileged leave', defaultDays: 15 },
        ],
      });
    }

    return NextResponse.json({
      message: 'Data cleanup completed - dummy employees removed, super admin updated',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
