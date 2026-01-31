import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "./prisma.js";
import type { User, UserRole } from "@prisma/client";

const SESSION_COOKIE_NAME = "rentals_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}

export async function getSessionUser(req: VercelRequest): Promise<SessionUser | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    // Session expired, delete it
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function createSession(userId: string): Promise<string> {
  const { generateSessionToken } = await import("./crypto.js");
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { token } });
  } catch {
    // Session might not exist, ignore
  }
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  // SameSite=None; Secure required for cross-origin cookies
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=None; Secure; Expires=${expires.toUTCString()}`
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=None; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}

export function requireAuth(user: SessionUser | null): user is SessionUser {
  return user !== null;
}

export function requireRole(user: SessionUser | null, roles: UserRole[]): user is SessionUser {
  return user !== null && roles.includes(user.role);
}
