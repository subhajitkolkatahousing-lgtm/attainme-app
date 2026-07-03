import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, leaveTypeId, startDate, endDate, reason, status } = data;

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const application = await db.leaveApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (leaveTypeId !== undefined) updateData.leaveTypeId = leaveTypeId;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (reason !== undefined) updateData.reason = reason;
    if (status !== undefined) updateData.status = status;

    const updated = await db.leaveApplication.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { name: true, empId: true, department: true, position: true } },
        leaveType: { select: { name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json({ error: 'Failed to update leave application' }, { status: 500 });
  }
}
