import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Soft delete: mark as inactive instead of hard delete
    const updated = await db.employee.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: `${updated.name} has been deactivated`, id: updated.id });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
