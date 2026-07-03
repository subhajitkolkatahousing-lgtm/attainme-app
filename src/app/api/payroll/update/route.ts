import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, basicSalary, workingDays, presentDays, overtime, deductions, bonus, netSalary, status } = data;

    if (!id) {
      return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
    }

    const payroll = await db.payroll.findUnique({ where: { id } });
    if (!payroll) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (basicSalary !== undefined) updateData.basicSalary = parseFloat(basicSalary);
    if (workingDays !== undefined) updateData.workingDays = parseInt(workingDays);
    if (presentDays !== undefined) updateData.presentDays = parseInt(presentDays);
    if (overtime !== undefined) updateData.overtime = parseFloat(overtime);
    if (deductions !== undefined) updateData.deductions = parseFloat(deductions);
    if (bonus !== undefined) updateData.bonus = parseFloat(bonus);
    if (netSalary !== undefined) updateData.netSalary = parseFloat(netSalary);
    if (status !== undefined) updateData.status = status;

    const updated = await db.payroll.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { name: true, empId: true, department: true, position: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update payroll error:', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}
