import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.employee.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Database already seeded', admin: { empId: 'SUADMIN01', name: 'Super Admin' } });
    }

    // Create Super Admin
    const superAdmin = await db.employee.create({
      data: {
        empId: 'SUADMIN01', name: 'Super Admin', email: 'superadmin@attendancekhata.com',
        phone: '+91-9876543200', department: 'Administration', position: 'Super Administrator',
        salary: 100000, role: 'super_admin', password: 'super123',
      },
    });

    // Create Admin
    const admin = await db.employee.create({
      data: {
        empId: 'ADMIN001', name: 'Admin User', email: 'admin@attendancekhata.com',
        phone: '+91-9876543210', department: 'Administration', position: 'HR Manager',
        salary: 75000, role: 'admin', password: 'admin123',
      },
    });

    // Create Manager
    const manager = await db.employee.create({
      data: {
        empId: 'MGR001', name: 'Ravi Verma', email: 'ravi@company.com',
        phone: '+91-9876543201', department: 'Operations', position: 'Operations Manager',
        salary: 65000, role: 'manager', password: 'mgr123',
      },
    });

    // Create Employees (Presales & Sales)
    const employees = await Promise.all([
      db.employee.create({ data: { empId: 'EMP001', name: 'Rahul Sharma', email: 'rahul@company.com', phone: '+91-9876543211', department: 'Sales', position: 'Sales Executive', salary: 50000, role: 'employee', subRole: 'sales', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP002', name: 'Priya Patel', email: 'priya@company.com', phone: '+91-9876543212', department: 'Sales', position: 'Sales Representative', salary: 45000, role: 'employee', subRole: 'sales', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP003', name: 'Amit Kumar', email: 'amit@company.com', phone: '+91-9876543213', department: 'Pre-Sales', position: 'Pre-Sales Consultant', salary: 40000, role: 'employee', subRole: 'presales', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP004', name: 'Sneha Reddy', email: 'sneha@company.com', phone: '+91-9876543214', department: 'Pre-Sales', position: 'Pre-Sales Analyst', salary: 48000, role: 'employee', subRole: 'presales', password: 'emp123' } }),
      db.employee.create({ data: { empId: 'EMP005', name: 'Vikram Singh', email: 'vikram@company.com', phone: '+91-9876543215', department: 'Sales', position: 'Sales Lead', salary: 52000, role: 'employee', subRole: 'sales', password: 'emp123' } }),
    ]);

    // Create Leave Types
    const leaveTypes = await Promise.all([
      db.leaveType.create({ data: { name: 'Casual Leave', description: 'Casual leave for personal work', defaultDays: 12 } }),
      db.leaveType.create({ data: { name: 'Sick Leave', description: 'Leave for medical reasons', defaultDays: 10 } }),
      db.leaveType.create({ data: { name: 'Earned Leave', description: 'Earned/privileged leave', defaultDays: 15 } }),
      db.leaveType.create({ data: { name: 'Maternity Leave', description: 'Maternity leave for female employees', defaultDays: 180 } }),
    ]);

    // Create Leave Balances for all employees + manager
    const year = new Date().getFullYear();
    for (const emp of [manager, ...employees]) {
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
      superAdmin: { empId: superAdmin.empId, name: superAdmin.name },
      admin: { empId: admin.empId, name: admin.name },
      manager: { empId: manager.empId, name: manager.name },
      employees: employees.length,
      leaveTypes: leaveTypes.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
