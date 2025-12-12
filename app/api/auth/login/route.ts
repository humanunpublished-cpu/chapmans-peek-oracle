import { NextRequest, NextResponse } from 'next/server';

const VALID_USERS = [
  { email: 'warren@chapmans.co.za', password: 'oracle2025', name: 'Warren Chapman', role: 'admin' },
  { email: 'mike@security360.co.za', password: 'guardian360', name: 'Mike Sears', role: 'admin' },
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const user = VALID_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = Buffer.from(JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, role: user.role },
    });

    response.cookies.set('oracle_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
