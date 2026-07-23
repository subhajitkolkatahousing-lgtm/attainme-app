import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const { id, totalDays, usedDays } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Leave balance ID is required' }, { status: 400 });
    }

    if (totalDays === undefined && usedDays === undefined) {
      return NextResponse.json({ error: 'At least one of totalDays or usedDays must be provided' }, { status: 400 });
    }

    const existing = await db.leaveBalance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (totalDays !== undefined) updateData.totalDays = parseInt(String(totalDays));
    if (usedDays !== undefined) updateData.usedDays = parseInt(String(usedDays));

    const updated = await db.leaveBalance.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { name: true, empId: true, department: true } },
        leaveType: { select: { name: true, defaultDays: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update leave balance error:', error);
    return NextResponse.json({ error: 'Failed to update leave balance' }, { status: 500 });
  }
}
