import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { employeeId, photo, latitude, longitude, address, isManual, manualCheckIn } = data;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Location is required for non-manual check-ins
    if (!isManual && (!latitude || !longitude)) {
      return NextResponse.json({ error: 'Location is required for check-in. Please enable GPS and allow location permission.' }, { status: 400 });
    }

    // For manual entries, allow specifying the date from manualCheckIn
    let date: string;
    if (isManual && manualCheckIn) {
      const d = new Date(manualCheckIn);
      date = d.toISOString().split('T')[0];
    } else {
      date = new Date().toISOString().split('T')[0];
    }

    // Check if already checked in on that date
    const existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });

    if (existing && existing.checkIn) {
      return NextResponse.json({ error: 'Already checked in on this date. Please check out first.' }, { status: 400 });
    }

    const checkInTime = (isManual && manualCheckIn) ? new Date(manualCheckIn) : new Date();

    const attendance = await db.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: {
        checkIn: checkInTime,
        checkInLat: latitude || null,
        checkInLng: longitude || null,
        checkInPhoto: photo || null,
        checkInAddr: address || null,
        status: isManual ? 'approved' : 'pending',
        ...(isManual ? { isRegularised: true, regulariseReason: 'Manual entry by admin/manager' } : {}),
      },
      create: {
        employeeId,
        date,
        checkIn: checkInTime,
        checkInLat: latitude || null,
        checkInLng: longitude || null,
        checkInPhoto: photo || null,
        checkInAddr: address || null,
        status: isManual ? 'approved' : 'pending',
        isRegularised: isManual ? true : false,
        regulariseReason: isManual ? 'Manual entry by admin/manager' : null,
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
