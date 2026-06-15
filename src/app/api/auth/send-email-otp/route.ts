import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { setOtp, generateOtpCode } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    // Find employee by email
    const employee = await db.employee.findFirst({
      where: { email, active: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
    }

    // Generate OTP
    const otp = generateOtpCode();

    // Store OTP in shared store (key = email)
    setOtp(email, otp);

    // ===== EMAIL SENDING =====
    // Currently in DEMO mode: OTP shown on screen
    //
    // To send REAL emails for free, use any of these:
    //
    // Option 1: Resend (resend.com) - Free 100 emails/day
    //   import Resend from 'resend';
    //   const resend = new Resend(process.env.RESEND_API_KEY);
    //   await resend.emails.send({
    //     from: 'FaceAttend <noreply@yourdomain.com>',
    //     to: email,
    //     subject: 'Your FaceAttend Login OTP',
    //     html: `<h2>Your OTP is: <strong>${otp}</strong></h2><p>Expires in 5 minutes.</p>`,
    //   });
    //
    // Option 2: Nodemailer + Gmail SMTP - Free
    //   import nodemailer from 'nodemailer';
    //   const transporter = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    //   });
    //   await transporter.sendMail({
    //     from: process.env.GMAIL_USER,
    //     to: email,
    //     subject: 'FaceAttend Login OTP',
    //     html: `<h2>Your OTP is: <strong>${otp}</strong></h2>`,
    //   });
    //
    // Option 3: SendGrid - Free 100 emails/day
    // Option 4: Mailgun - Free tier available

    console.log(`Email OTP for ${email}: ${otp}`);

    return NextResponse.json({
      message: 'OTP sent to your email',
      // In demo mode, return OTP to show on screen
      // Remove demoOtp in production!
      demoOtp: otp,
      email,
      name: employee.name,
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
