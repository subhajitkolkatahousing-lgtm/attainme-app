import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { payrollId } = await req.json();
    if (!payrollId) return NextResponse.json({ error: 'Payroll ID required' }, { status: 400 });

    const payroll = await db.payroll.update({
      where: { id: payrollId },
      data: { status: 'paid', paidAt: new Date() },
    });
    return NextResponse.json(payroll);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
