import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getOtp, deleteOtp, incrementAttempts } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Check OTP store (key = email)
    const stored = getOtp(email);

    if (!stored) {
      return NextResponse.json({ error: 'No OTP requested for this email. Please request a new OTP.' }, { status: 400 });
    }

    // Check expiry
    if (Date.now() > stored.expires) {
      deleteOtp(email);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts
    if (stored.attempts >= 5) {
      deleteOtp(email);
      return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 429 });
    }

    // Verify OTP
    if (stored.otp !== otp) {
      const attempts = incrementAttempts(email);
      return NextResponse.json({ error: `Invalid OTP. ${5 - attempts} attempts remaining.` }, { status: 401 });
    }

    // OTP verified - delete from store
    deleteOtp(email);

    // Find employee
    const employee = await db.employee.findFirst({
      where: { email, active: true },
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
    console.error('Verify email OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
