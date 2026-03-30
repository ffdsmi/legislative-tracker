import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'LGM_SUPER_SECRET_LOCAL_ONLY';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { workspace: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        workspaceId: user.workspaceId, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaceName: user.workspace.name
      }
    });

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

