import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Valid invite codes (in production, store in database with expiry)
const VALID_INVITES: Record<string, { used: boolean; createdBy: string; expiresAt: Date }> = {
  'ORACLE-2025-ALPHA': { used: false, createdBy: 'warren@chapmans.co.za', expiresAt: new Date('2025-12-31') },
  'SECURITY-360-VIP': { used: false, createdBy: 'mike@security360.co.za', expiresAt: new Date('2025-12-31') },
  'CHAPMANS-BETA-001': { used: false, createdBy: 'warren@chapmans.co.za', expiresAt: new Date('2025-12-31') },
};

// Registered users (in production, store in database)
const REGISTERED_USERS: Record<string, { password: string; role: string; name: string; inviteCode: string }> = {};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chapmans-peek-oracle-secret-key-2025'
);

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, email, password } = await request.json();

    if (!inviteCode || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate invite code
    const invite = VALID_INVITES[inviteCode.toUpperCase()];
    
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (invite.used) {
      return NextResponse.json(
        { error: 'This invite code has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    if (REGISTERED_USERS[normalizedEmail]) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Register user
    const name = normalizedEmail.split('@')[0];
    REGISTERED_USERS[normalizedEmail] = {
      password,
      role: 'user',
      name,
      inviteCode: inviteCode.toUpperCase(),
    };

    // Mark invite as used
    invite.used = true;

    // Create JWT token
    const token = await new SignJWT({
      email: normalizedEmail,
      role: 'user',
      name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('oracle-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        email: normalizedEmail,
        name,
        role: 'user',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// Generate new invite codes (admin only)
export async function PUT(request: NextRequest) {
  try {
    // In production, verify admin JWT token here
    const { count = 1 } = await request.json();

    const newCodes: string[] = [];
    for (let i = 0; i < Math.min(count, 10); i++) {
      const code = `ORACLE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      VALID_INVITES[code] = {
        used: false,
        createdBy: 'admin',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
      newCodes.push(code);
    }

    return NextResponse.json({
      success: true,
      codes: newCodes,
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite codes' },
      { status: 500 }
    );
  }
}
