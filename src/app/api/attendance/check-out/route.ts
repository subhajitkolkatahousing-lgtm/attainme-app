import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { employeeId, photo, latitude, longitude, address, isManual, manualCheckOut, attendanceId } = data;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Location is required for non-manual check-outs
    if (!isManual && (!latitude || !longitude)) {
      return NextResponse.json({ error: 'Location is required for check-out. Please enable GPS and allow location permission.' }, { status: 400 });
    }

    // For manual entries with attendanceId, find by ID; otherwise find by today's date
    let existing;
    if (isManual && attendanceId) {
      existing = await db.attendance.findUnique({ where: { id: attendanceId } });
    } else {
      const today = new Date().toISOString().split('T')[0];
      existing = await db.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: today } },
      });
    }

    if (!existing || !existing.checkIn) {
      return NextResponse.json({ error: 'You have not checked in on this date' }, { status: 400 });
    }

    if (existing.checkOut) {
      return NextResponse.json({ error: 'Already checked out on this date' }, { status: 400 });
    }

    const checkOutTime = (isManual && manualCheckOut) ? new Date(manualCheckOut) : new Date();
    const workHours = (checkOutTime.getTime() - new Date(existing.checkIn).getTime()) / (1000 * 60 * 60);

    const attendance = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null,
        checkOutPhoto: photo || null,
        checkOutAddr: address || null,
        status: isManual ? 'approved' : 'pending',
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
