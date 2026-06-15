import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Approve or reject attendance
export async function POST(req: Request) {
  try {
    const { attendanceId, action, rejectReason, adminId } = await req.json();
    if (!attendanceId || !action || !adminId) {
      return NextResponse.json({ error: 'attendanceId, action and adminId required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const attendance = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectReason: action === 'reject' ? rejectReason : null,
      },
      include: { employee: { select: { name: true, empId: true, department: true } } },
    });

    // If approved and both checkIn and checkOut exist, calculate work hours
    if (action === 'approve' && attendance.checkIn && attendance.checkOut) {
      const hours = (new Date(attendance.checkOut).getTime() - new Date(attendance.checkIn).getTime()) / (1000 * 60 * 60);
      await db.attendance.update({
        where: { id: attendanceId },
        data: { workHours: Math.round(hours * 100) / 100 },
      });
    }

    return NextResponse.json(attendance);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Get pending attendance for admin
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'pending';

    const records = await db.attendance.findMany({
      where: { status },
      include: { employee: { select: { name: true, empId: true, department: true, position: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(records);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
