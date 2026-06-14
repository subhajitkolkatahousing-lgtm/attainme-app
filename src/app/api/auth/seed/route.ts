import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.employee.findUnique({ where: { empId: 'ADMIN001' } });
    if (existingAdmin) {
      return NextResponse.json({ message: 'Database already seeded', admin: { empId: 'ADMIN001', name: existingAdmin.name } });
    }

    // Create admin
    const admin = await db.employee.create({
      data: {
        empId: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@company.com',
        phone: '+91-9876543210',
        department: 'Administration',
        position: 'HR Manager',
        salary: 75000,
        role: 'admin',
        password: 'admin123',
      },
    });

    // Create sample employees
    const employees = await Promise.all([
      db.employee.create({
        data: {
          empId: 'EMP001',
          name: 'Rahul Sharma',
          email: 'rahul@company.com',
          phone: '+91-9876543211',
          department: 'Engineering',
          position: 'Software Developer',
          salary: 50000,
          role: 'employee',
          password: 'emp123',
        },
      }),
      db.employee.create({
        data: {
          empId: 'EMP002',
          name: 'Priya Patel',
          email: 'priya@company.com',
          phone: '+91-9876543212',
          department: 'Design',
          position: 'UI/UX Designer',
          salary: 45000,
          role: 'employee',
          password: 'emp123',
        },
      }),
      db.employee.create({
        data: {
          empId: 'EMP003',
          name: 'Amit Kumar',
          email: 'amit@company.com',
          phone: '+91-9876543213',
          department: 'Marketing',
          position: 'Marketing Manager',
          salary: 55000,
          role: 'employee',
          password: 'emp123',
        },
      }),
      db.employee.create({
        data: {
          empId: 'EMP004',
          name: 'Sneha Gupta',
          email: 'sneha@company.com',
          phone: '+91-9876543214',
          department: 'Engineering',
          position: 'QA Engineer',
          salary: 42000,
          role: 'employee',
          password: 'emp123',
        },
      }),
      db.employee.create({
        data: {
          empId: 'EMP005',
          name: 'Vikram Singh',
          email: 'vikram@company.com',
          phone: '+91-9876543215',
          department: 'Finance',
          position: 'Accountant',
          salary: 48000,
          role: 'employee',
          password: 'emp123',
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { empId: admin.empId, name: admin.name },
      employees: employees.map(e => ({ empId: e.empId, name: e.name })),
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
