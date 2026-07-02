import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Update existing admin to super_admin if no super_admin exists
    const superAdminExists = await db.employee.findFirst({ where: { role: 'super_admin' } });
    if (!superAdminExists) {
      const firstAdmin = await db.employee.findFirst({ where: { role: 'admin' } });
      if (firstAdmin) {
        await db.employee.update({ where: { id: firstAdmin.id }, data: { role: 'super_admin' } });
      }
    }

    // Set subRole for existing employees without one
    const employees = await db.employee.findMany({ where: { role: 'employee', subRole: null } });
    for (const emp of employees) {
      await db.employee.update({
        where: { id: emp.id },
        data: { subRole: 'sales' },
      });
    }

    // Create Super Admin if doesn't exist
    const sa = await db.employee.findUnique({ where: { empId: 'SUADMIN01' } });
    if (!sa) {
      await db.employee.create({
        data: {
          empId: 'SUADMIN01', name: 'Super Admin', email: 'superadmin@attendancekhata.com',
          phone: '+91-9876543200', department: 'Administration', position: 'Super Administrator',
          salary: 100000, role: 'super_admin', password: 'super123',
        },
      });
    }

    // Create Manager if doesn't exist
    const mgr = await db.employee.findUnique({ where: { empId: 'MGR001' } });
    if (!mgr) {
      await db.employee.create({
        data: {
          empId: 'MGR001', name: 'Ravi Verma', email: 'ravi@company.com',
          phone: '+91-9876543201', department: 'Operations', position: 'Operations Manager',
          salary: 65000, role: 'manager', password: 'mgr123',
        },
      });
    }

    // Set presales subRole for specific employees
    const emp003 = await db.employee.findUnique({ where: { empId: 'EMP003' } });
    if (emp003 && emp003.subRole !== 'presales') {
      await db.employee.update({ where: { id: emp003.id }, data: { subRole: 'presales', department: 'Pre-Sales', position: 'Pre-Sales Consultant' } });
    }
    const emp004 = await db.employee.findUnique({ where: { empId: 'EMP004' } });
    if (emp004 && emp004.subRole !== 'presales') {
      await db.employee.update({ where: { id: emp004.id }, data: { subRole: 'presales', department: 'Pre-Sales', position: 'Pre-Sales Analyst' } });
    }

    // Set sales subRole for remaining employees
    const salesEmps = await db.employee.findMany({ where: { role: 'employee', subRole: null } });
    for (const emp of salesEmps) {
      await db.employee.update({ where: { id: emp.id }, data: { subRole: 'sales' } });
    }

    return NextResponse.json({
      message: 'Data migration completed',
      updated: employees.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
