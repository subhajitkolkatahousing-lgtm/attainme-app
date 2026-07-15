import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { empId, password } = await req.json();

    if (!empId || !password) {
      return NextResponse.json({ error: 'Employee ID and password are required' }, { status: 400 });
    }

    // Try to find by empId first, then by email
    let employee = await db.employee.findUnique({ where: { empId } });
    if (!employee) {
      employee = await db.employee.findUnique({ where: { email: empId } });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!employee.active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    return NextResponse.json({
      id: employee.id,
      empId: employee.empId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      role: employee.role,
      subRole: employee.subRole,
      photoUrl: employee.photoUrl,
      bankAccount: employee.bankAccount,
      bankIfsc: employee.bankIfsc,
      bankName: employee.bankName,
      panNumber: employee.panNumber,
      joinDate: employee.joinDate?.toISOString?.() || null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
