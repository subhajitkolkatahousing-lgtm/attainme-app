import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Admin approve or reject leave application
export async function POST(req: Request) {
  try {
    const { applicationId, action, rejectReason, adminId } = await req.json();
    if (!applicationId || !action || !adminId) {
      return NextResponse.json({ error: 'applicationId, action and adminId required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const application = await db.leaveApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application already processed' }, { status: 400 });
    }

    const updated = await db.leaveApplication.update({
      where: { id: applicationId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectReason: action === 'reject' ? rejectReason : null,
      },
      include: {
        employee: { select: { name: true, empId: true, department: true } },
        leaveType: { select: { name: true } },
      },
    });

    // If approved, update leave balance
    if (action === 'approve') {
      const start = new Date(application.startDate);
      const end = new Date(application.endDate);
      let days = 0;
      const current = new Date(start);
      while (current <= end) {
        if (current.getDay() !== 0) days++;
        current.setDate(current.getDate() + 1);
      }

      const year = start.getFullYear();
      const balance = await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: application.employeeId,
            leaveTypeId: application.leaveTypeId,
            year,
          },
        },
      });

      if (balance) {
        await db.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: balance.usedDays + days },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
