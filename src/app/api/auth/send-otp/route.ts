import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { setOtp, generateOtpCode } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Find employee by phone
    const employee = await db.employee.findFirst({
      where: { phone, active: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
    }

    // Generate OTP
    const otp = generateOtpCode();

    // Store OTP in shared store
    setOtp(phone, otp);

    // In production: Send OTP via SMS (Twilio, MSG91, etc.)
    // For demo: Return OTP in response (shown in UI)
    console.log(`OTP for ${phone}: ${otp}`);

    return NextResponse.json({
      message: 'OTP sent successfully',
      // In production, remove this line - OTP should only go via SMS
      demoOtp: otp,
      phone,
      name: employee.name,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
