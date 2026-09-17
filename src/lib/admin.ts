import "server-only";

/** The single account allowed to moderate testimonials. Unset means nobody. */
export const isAdmin = (user: { email: string } | null | undefined) =>
  Boolean(user && process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
