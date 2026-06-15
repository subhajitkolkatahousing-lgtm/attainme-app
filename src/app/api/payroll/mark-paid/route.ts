import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { payrollId } = await req.json();

    if (!payrollId) {
      return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
    }

    const payroll = await db.payroll.findUnique({ where: { id: payrollId } });

    if (!payroll) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const updated = await db.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      paidAt: updated.paidAt,
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
  }
}
