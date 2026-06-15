import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.employee.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Database already seeded', admin: { empId: 'ADMIN001', name: 'Admin User' } });
    }

    // Create Admin
    const admin = await db.employee.create({
      data: {
        empId: 'ADMIN001', name: 'Admin User', email: 'admin@attendancekhata.com',
        phone: '+91-9876543210', department: 'Administration', position: 'HR Manager',
        salary: 75000, role: 'admin', password: 'admin123',
      },
    });

    // Create Employees
    const employees = await Promise.all([
      db.employee.create({ data: { empId: 'EMP001', name: 'Rahul Sharma', email: 'rahul@company.com', phone: '+91-9876543211', department: 'Engineering', position: 'Software Developer', salary: 50000, role: 'employee', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP002', name: 'Priya Patel', email: 'priya@company.com', phone: '+91-9876543212', department: 'Design', position: 'UI Designer', salary: 45000, role: 'employee', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP003', name: 'Amit Kumar', email: 'amit@company.com', phone: '+91-9876543213', department: 'Marketing', position: 'Marketing Executive', salary: 40000, role: 'employee', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP004', name: 'Sneha Reddy', email: 'sneha@company.com', phone: '+91-9876543214', department: 'Finance', position: 'Accountant', salary: 48000, role: 'employee', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP005', name: 'Vikram Singh', email: 'vikram@company.com', phone: '+91-9876543215', department: 'Operations', position: 'Operations Lead', salary: 52000, role: 'employee', password: 'emp123' } }),
    ]);

    // Create Leave Types
    const leaveTypes = await Promise.all([
      db.leaveType.create({ data: { name: 'Casual Leave', description: 'Casual leave for personal work', defaultDays: 12 } }),
      db.leaveType.create({ data: { name: 'Sick Leave', description: 'Leave for medical reasons', defaultDays: 10 } }),
      db.leaveType.create({ data: { name: 'Earned Leave', description: 'Earned/privileged leave', defaultDays: 15 } }),
      db.leaveType.create({ data: { name: 'Maternity Leave', description: 'Maternity leave for female employees', defaultDays: 180 } }),
    ]);

    // Create Leave Balances for all employees
    const year = new Date().getFullYear();
    for (const emp of [...employees]) {
      for (const lt of leaveTypes) {
        await db.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            totalDays: lt.defaultDays,
            usedDays: 0,
            year,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { empId: admin.empId, name: admin.name },
      employees: employees.length,
      leaveTypes: leaveTypes.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
