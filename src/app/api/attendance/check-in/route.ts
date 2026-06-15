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

    // Check if already checked in today
    const existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing && existing.checkIn) {
      return NextResponse.json({ error: 'Already checked in today. Please check out first.' }, { status: 400 });
    }

    const attendance = await db.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: {
        checkIn: new Date(),
        checkInLat: latitude || null,
        checkInLng: longitude || null,
        checkInPhoto: photo || null,
        checkInAddr: address || null,
        status: 'checked-in',
      },
      create: {
        employeeId,
        date: today,
        checkIn: new Date(),
        checkInLat: latitude || null,
        checkInLng: longitude || null,
        checkInPhoto: photo || null,
        checkInAddr: address || null,
        status: 'checked-in',
      },
    });

    return NextResponse.json({
      id: attendance.id,
      date: attendance.date,
      checkIn: attendance.checkIn,
      status: attendance.status,
      location: latitude && longitude ? { lat: latitude, lng: longitude } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
