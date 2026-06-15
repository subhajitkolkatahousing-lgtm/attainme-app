import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { reimbursementId, action, adminId, rejectReason } = await req.json();

    if (!reimbursementId || !action || !adminId) {
      return NextResponse.json({ error: 'Reimbursement ID, action, and admin ID are required' }, { status: 400 });
    }

    if (!['approve', 'reject', 'paid'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve, reject, or paid' }, { status: 400 });
    }

    const admin = await db.employee.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can approve/reject reimbursements' }, { status: 403 });
    }

    const reimbursement = await db.reimbursement.findUnique({ where: { id: reimbursementId } });
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 });
    }

    // For approve/reject, status must be 'pending'; for paid, status must be 'approved'
    if (action === 'paid' && reimbursement.status !== 'approved') {
      return NextResponse.json({ error: 'Reimbursement must be approved before marking as paid' }, { status: 400 });
    }
    if ((action === 'approve' || action === 'reject') && reimbursement.status !== 'pending') {
      return NextResponse.json({ error: 'Reimbursement already processed' }, { status: 400 });
    }

    let newStatus: string;
    if (action === 'approve') newStatus = 'approved';
    else if (action === 'reject') newStatus = 'rejected';
    else newStatus = 'paid';

    const updated = await db.reimbursement.update({
      where: { id: reimbursementId },
      data: {
        status: newStatus,
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectReason: action === 'reject' ? (rejectReason || 'Rejected by admin') : null,
      },
      include: {
        employee: {
          select: { name: true, empId: true, department: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Approve reimbursement error:', error);
    return NextResponse.json({ error: 'Failed to process reimbursement' }, { status: 500 });
  }
}
