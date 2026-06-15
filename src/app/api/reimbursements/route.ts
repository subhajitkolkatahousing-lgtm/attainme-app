import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const reimbursements = await db.reimbursement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { name: true, empId: true, department: true, position: true },
        },
      },
    });

    return NextResponse.json(reimbursements);
  } catch (error) {
    console.error('Get reimbursements error:', error);
    return NextResponse.json({ error: 'Failed to fetch reimbursements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, type, amount, photo, description } = await req.json();

    if (!employeeId || !type || !amount || !photo) {
      return NextResponse.json({ error: 'Employee ID, type, amount, and photo are required' }, { status: 400 });
    }

    if (!['travel_allowance', 'mobile_recharge'].includes(type)) {
      return NextResponse.json({ error: 'Invalid reimbursement type' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const reimbursement = await db.reimbursement.create({
      data: {
        employeeId,
        type,
        amount: parseFloat(amount),
        photo,
        description: description || null,
        status: 'pending',
      },
      include: {
        employee: {
          select: { name: true, empId: true, department: true },
        },
      },
    });

    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    console.error('Create reimbursement error:', error);
    return NextResponse.json({ error: 'Failed to create reimbursement' }, { status: 500 });
  }
}
