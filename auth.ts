import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV !== "production"
    ? "development-only-secret-do-not-use-in-production-32chars"
    : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { authorizeTutorCredentials } = await import(
          "@/lib/auth-credentials"
        );
        return authorizeTutorCredentials(
          credentials as Record<"email" | "password", string> | undefined,
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
