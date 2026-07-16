export const PUBLIC_DEMO_ACCOUNTS = {
  free: {
    email: "free@ats.mehdisharifi.com",
    password: "TryShortlistFree2026!",
    tier: "free",
  },
  pro: {
    email: "pro@ats.mehdisharifi.com",
    password: "TryShortlistPro2026!",
    tier: "pro",
  },
} as const;

export type PublicDemoTier = keyof typeof PUBLIC_DEMO_ACCOUNTS;

const publicDemoEmails = new Set<string>(
  Object.values(PUBLIC_DEMO_ACCOUNTS).map((account) => account.email),
);

export function isPublicDemoAccountEmail(email: string): boolean {
  return publicDemoEmails.has(email.trim().toLowerCase());
}
