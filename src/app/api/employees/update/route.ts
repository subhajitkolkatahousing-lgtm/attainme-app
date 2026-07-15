import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, name, email, phone, department, position, salary, role, subRole, password, active, bankAccount, bankIfsc, bankName, panNumber, joinDate } = data;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check for duplicate email (excluding current employee)
    if (email && email !== employee.email) {
      const existing = await db.employee.findFirst({ where: { email, id: { not: id } } });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (salary !== undefined) updateData.salary = parseFloat(salary);
    if (role !== undefined) updateData.role = role;
    if (subRole !== undefined) updateData.subRole = subRole || null;
    if (password !== undefined && password !== '') updateData.password = password;
    if (active !== undefined) updateData.active = active;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount || null;
    if (bankIfsc !== undefined) updateData.bankIfsc = bankIfsc || null;
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (panNumber !== undefined) updateData.panNumber = panNumber || null;
    if (joinDate !== undefined) updateData.joinDate = joinDate ? new Date(joinDate) : null;

    const updated = await db.employee.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      empId: updated.empId,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      department: updated.department,
      position: updated.position,
      salary: updated.salary,
      role: updated.role,
      subRole: updated.subRole,
      active: updated.active,
      bankAccount: updated.bankAccount,
      bankIfsc: updated.bankIfsc,
      bankName: updated.bankName,
      panNumber: updated.panNumber,
      joinDate: updated.joinDate?.toISOString?.() || null,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
