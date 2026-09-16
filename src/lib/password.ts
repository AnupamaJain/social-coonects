import bcrypt from "bcryptjs";

// Kept out of lib/auth.ts (which is `server-only`) so CLI scripts such as the
// seeder can hash a password without pulling in the request-scoped session code.
export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
