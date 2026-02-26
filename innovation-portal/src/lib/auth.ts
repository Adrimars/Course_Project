import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validations/user';
import { Role } from '@/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input shape with Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // Verify password
        const isValid = await compare(password, user.hashedPassword);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.roleRefreshedAt = Date.now();
      }
      // Refresh role from DB at most once every 5 minutes to pick up
      // admin promotions/demotions without requiring re-login, while
      // avoiding a DB query on every single request.
      const ROLE_TTL_MS = 5 * 60 * 1000;
      const lastRefresh = (token.roleRefreshedAt as number | undefined) ?? 0;
      if (token.id && Date.now() - lastRefresh > ROLE_TTL_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role as Role;
          }
          token.roleRefreshedAt = Date.now();
        } catch (err) {
          // Gracefully fallback to the previously cached role on DB errors
          console.error('[JWT callback] role refresh failed, using cached role', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
};
