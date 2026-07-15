import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.employee.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Database already seeded' });
    }

    // Create Super Admin only - no dummy employees
    const superAdmin = await db.employee.create({
      data: {
        empId: 'SUADMIN01', name: 'Super Admin', email: 'matriksaha123@gmail.com',
        phone: null, department: 'Back Office', position: 'Super Administrator',
        salary: 0, role: 'super_admin', password: '#mat3084',
      },
    });

    // Create default Leave Types
    const leaveTypes = await Promise.all([
      db.leaveType.create({ data: { name: 'Casual Leave', description: 'Casual leave for personal work', defaultDays: 12 } }),
      db.leaveType.create({ data: { name: 'Sick Leave', description: 'Leave for medical reasons', defaultDays: 10 } }),
      db.leaveType.create({ data: { name: 'Earned Leave', description: 'Earned/privileged leave', defaultDays: 15 } }),
    ]);

    return NextResponse.json({
      message: 'Database seeded successfully',
      superAdmin: { empId: superAdmin.empId, name: superAdmin.name },
      leaveTypes: leaveTypes.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
