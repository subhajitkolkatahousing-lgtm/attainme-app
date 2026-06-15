import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const attendance = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    return NextResponse.json({
      checkedIn: attendance?.checkIn ? true : false,
      checkedOut: attendance?.checkOut ? true : false,
      attendance: attendance ? {
        id: attendance.id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workHours: attendance.workHours,
        checkInAddr: attendance.checkInAddr,
        checkOutAddr: attendance.checkOutAddr,
      } : null,
    });
  } catch (error) {
    console.error('Today attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch today attendance' }, { status: 500 });
  }
}
