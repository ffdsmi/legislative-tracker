import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'LGM_SUPER_SECRET_LOCAL_ONLY';

export async function POST(req) {
  try {
    const { email, password, name, workspaceName } = await req.json();

    if (!email || !password || !workspaceName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create workspace and user in a transaction
    const newUser = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: workspaceName },
      });

      return await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'ADMIN',
          workspaceId: workspace.id,
        },
      });
    });

    // Create default settings for this workspace
    await db.settings.create({
      data: { workspaceId: newUser.workspaceId }
    });

    const token = jwt.sign(
      { 
        userId: newUser.id, 
        workspaceId: newUser.workspaceId, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
    
    // In Next 14, setting cookies via response is reliable
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

