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
      checkedIn: !!attendance?.checkIn,
      checkedOut: !!attendance?.checkOut,
      attendance,
    });
  } catch (error) {
    console.error('Today attendance error:', error);
    return NextResponse.json({ error: 'Failed to get today status' }, { status: 500 });
  }
}
