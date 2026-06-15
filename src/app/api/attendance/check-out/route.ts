import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { employeeId, photo, latitude, longitude, address } = data;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!existing || !existing.checkIn) {
      return NextResponse.json({ error: 'You have not checked in today' }, { status: 400 });
    }

    if (existing.checkOut) {
      return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
    }

    const checkOutTime = new Date();
    const workHours = (checkOutTime.getTime() - new Date(existing.checkIn).getTime()) / (1000 * 60 * 60);

    const attendance = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null,
        checkOutPhoto: photo || null,
        checkOutAddr: address || null,
        status: 'checked-out',
        workHours: Math.round(workHours * 100) / 100,
      },
    });

    return NextResponse.json({
      id: attendance.id,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workHours: attendance.workHours,
      location: latitude && longitude ? { lat: latitude, lng: longitude } : null,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Failed to check out' }, { status: 500 });
  }
}
