import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { reimbursementId, action, adminId, rejectReason } = await req.json();

    if (!reimbursementId || !action || !adminId) {
      return NextResponse.json({ error: 'Reimbursement ID, action, and admin ID are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const admin = await db.employee.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can approve/reject reimbursements' }, { status: 403 });
    }

    const reimbursement = await db.reimbursement.findUnique({ where: { id: reimbursementId } });
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 });
    }

    if (reimbursement.status !== 'pending') {
      return NextResponse.json({ error: 'Reimbursement already processed' }, { status: 400 });
    }

    const updated = await db.reimbursement.update({
      where: { id: reimbursementId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
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
