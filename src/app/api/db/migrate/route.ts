import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Add subRole column if it doesn't exist (raw SQL for Neon)
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "subRole" TEXT;`);
    } catch (e: any) {
      // Column may already exist
      if (!e.message?.includes('already exists')) {
        console.log('subRole column note:', e.message);
      }
    }
    return NextResponse.json({ message: 'Migration completed - subRole column added' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
