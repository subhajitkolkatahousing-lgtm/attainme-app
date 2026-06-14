import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        empId: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        salary: true,
        role: true,
        joinDate: true,
        photoUrl: true,
        active: true,
      },
    });
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const { empId, name, email, phone, department, position, salary, role, password } = data;

    if (!empId || !name || !email || !department || !position || !salary || !password) {
      return NextResponse.json({ error: 'All required fields must be provided' }, { status: 400 });
    }

    const existing = await db.employee.findFirst({
      where: { OR: [{ empId }, { email }] },
    });

    if (existing) {
      return NextResponse.json({ error: 'Employee ID or email already exists' }, { status: 409 });
    }

    const employee = await db.employee.create({
      data: {
        empId,
        name,
        email,
        phone: phone || null,
        department,
        position,
        salary: parseFloat(salary),
        role: role || 'employee',
        password,
      },
    });

    return NextResponse.json({
      id: employee.id,
      empId: employee.empId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      role: employee.role,
    }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
