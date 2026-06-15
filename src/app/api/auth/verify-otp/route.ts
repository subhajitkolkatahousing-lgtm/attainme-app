import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getOtp, deleteOtp, incrementAttempts } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    // Check OTP store
    const stored = getOtp(phone);

    if (!stored) {
      return NextResponse.json({ error: 'No OTP requested for this number. Please request a new OTP.' }, { status: 400 });
    }

    // Check expiry
    if (Date.now() > stored.expires) {
      deleteOtp(phone);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts
    if (stored.attempts >= 5) {
      deleteOtp(phone);
      return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 429 });
    }

    // Verify OTP
    if (stored.otp !== otp) {
      const attempts = incrementAttempts(phone);
      return NextResponse.json({ error: `Invalid OTP. ${5 - attempts} attempts remaining.` }, { status: 401 });
    }

    // OTP verified - delete from store
    deleteOtp(phone);

    // Find employee
    const employee = await db.employee.findFirst({
      where: { phone, active: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: employee.id,
      empId: employee.empId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      role: employee.role,
      photoUrl: employee.photoUrl,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
