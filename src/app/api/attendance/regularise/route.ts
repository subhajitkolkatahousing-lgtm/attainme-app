import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { employeeId, date, checkIn, checkOut, reason } = await req.json();
    if (!employeeId || !date || !reason) {
      return NextResponse.json({ error: 'employeeId, date and reason required' }, { status: 400 });
    }

    const existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });

    if (existing) {
      const updated = await db.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: checkIn ? new Date(checkIn) : existing.checkIn,
          checkOut: checkOut ? new Date(checkOut) : existing.checkOut,
          status: 'pending',
          isRegularised: true,
          regulariseReason: reason,
        },
        include: { employee: { select: { name: true, empId: true, department: true } } },
      });
      return NextResponse.json(updated);
    }

    const attendance = await db.attendance.create({
      data: {
        employeeId,
        date,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: 'pending',
        isRegularised: true,
        regulariseReason: reason,
      },
      include: { employee: { select: { name: true, empId: true, department: true } } },
    });
    return NextResponse.json(attendance);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
