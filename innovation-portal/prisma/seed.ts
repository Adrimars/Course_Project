/**
 * T052 – Seed script
 * Run: npm run db:seed  (or: npx prisma db seed)
 *
 * Creates:
 *   • admin@example.com / Admin123!  → role ADMIN
 *   • user1@example.com / User1234!  → role USER
 *   • user2@example.com / User5678!  → role USER
 *   • 5 sample ideas in various states
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱  Seeding database …');

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      hashedPassword: hashSync('Admin123!', 12),
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      name: 'Alice Employee',
      email: 'user1@example.com',
      hashedPassword: hashSync('User1234!', 12),
      role: 'USER',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      name: 'Bob Employee',
      email: 'user2@example.com',
      hashedPassword: hashSync('User5678!', 12),
      role: 'USER',
    },
  });

  console.log(`  ✓ Users: ${admin.email}, ${user1.email}, ${user2.email}`);

  // ── Ideas ──────────────────────────────────────────────────────────────────

  // Idea 1 – SUBMITTED (new, not yet reviewed)
  const idea1 = await prisma.idea.upsert({
    where: { id: 'seed-idea-1' },
    update: {},
    create: {
      id: 'seed-idea-1',
      title: 'Automated Code Review Pipeline',
      description:
        'Implement an AI-powered automated code review pipeline that integrates with our CI/CD workflows. ' +
        'This would significantly reduce the manual review burden on senior engineers and catch common issues ' +
        'earlier in the development process, improving overall code quality and developer productivity.',
      category: 'TECHNOLOGY',
      status: 'SUBMITTED',
      visibility: 'PUBLIC',
      submitterId: user1.id,
    },
  });

  // Idea 2 – UNDER_REVIEW
  const idea2 = await prisma.idea.upsert({
    where: { id: 'seed-idea-2' },
    update: {},
    create: {
      id: 'seed-idea-2',
      title: 'Cross-Department Knowledge Sharing Sessions',
      description:
        'Establish bi-weekly cross-department knowledge sharing sessions where teams present their recent ' +
        'projects, learnings, and challenges. This would improve organizational alignment, reduce duplicated ' +
        'effort, and foster a collaborative culture that drives innovation across the company.',
      category: 'PROCESS',
      status: 'UNDER_REVIEW',
      visibility: 'PUBLIC',
      submitterId: user1.id,
    },
  });

  // Idea 3 – ACCEPTED
  const idea3 = await prisma.idea.upsert({
    where: { id: 'seed-idea-3' },
    update: {},
    create: {
      id: 'seed-idea-3',
      title: 'Remote Ergonomics Stipend Program',
      description:
        'Introduce a yearly ergonomics stipend for all remote employees to purchase home-office equipment. ' +
        'Studies show ergonomic setups reduce repetitive strain injuries by 40% and increase productivity. ' +
        'A $500 annual allowance per employee would pay for itself within three months of improved output.',
      category: 'PRODUCT',
      status: 'ACCEPTED',
      visibility: 'PUBLIC',
      submitterId: user2.id,
    },
  });

  // Idea 4 – REJECTED
  const idea4 = await prisma.idea.upsert({
    where: { id: 'seed-idea-4' },
    update: {},
    create: {
      id: 'seed-idea-4',
      title: 'Company-Wide NFT Reward System',
      description:
        'Replace our current employee recognition program with an NFT-based reward system on the Ethereum blockchain. ' +
        'Employees would earn tradeable NFT badges for achievements, creating a marketplace of recognition. ' +
        'This would modernize our rewards approach and attract tech-savvy talent to the organization.',
      category: 'TECHNOLOGY',
      status: 'REJECTED',
      visibility: 'PUBLIC',
      submitterId: user2.id,
    },
  });

  // Idea 5 – SUBMITTED, PRIVATE
  const idea5 = await prisma.idea.upsert({
    where: { id: 'seed-idea-5' },
    update: {},
    create: {
      id: 'seed-idea-5',
      title: 'Internal Podcast for Leadership Updates',
      description:
        'Launch a monthly internal podcast where senior leadership discusses company strategy, upcoming changes, ' +
        'and spotlights team achievements. This would improve executive communication, increase transparency, ' +
        'and give employees a regular touchpoint with leadership in an accessible audio format.',
      category: 'OTHER',
      status: 'SUBMITTED',
      visibility: 'PRIVATE',
      submitterId: user1.id,
    },
  });

  console.log(
    `  ✓ Ideas: ${idea1.id}, ${idea2.id}, ${idea3.id}, ${idea4.id}, ${idea5.id}`
  );

  // ── Status History for reviewed ideas ──────────────────────────────────────

  await prisma.statusHistory.upsert({
    where: { id: 'seed-sh-1' },
    update: {},
    create: {
      id: 'seed-sh-1',
      ideaId: idea2.id,
      fromStatus: 'SUBMITTED',
      toStatus: 'UNDER_REVIEW',
      adminId: admin.id,
      feedback: 'Opened by administrator for review.',
    },
  });

  await prisma.statusHistory.upsert({
    where: { id: 'seed-sh-2' },
    update: {},
    create: {
      id: 'seed-sh-2',
      ideaId: idea3.id,
      fromStatus: 'SUBMITTED',
      toStatus: 'UNDER_REVIEW',
      adminId: admin.id,
      feedback: 'Opened by administrator for review.',
    },
  });

  await prisma.statusHistory.upsert({
    where: { id: 'seed-sh-3' },
    update: {},
    create: {
      id: 'seed-sh-3',
      ideaId: idea3.id,
      fromStatus: 'UNDER_REVIEW',
      toStatus: 'ACCEPTED',
      adminId: admin.id,
      feedback: 'Excellent proposal backed by solid data. Accepted for Q3 budget cycle.',
    },
  });

  await prisma.statusHistory.upsert({
    where: { id: 'seed-sh-4' },
    update: {},
    create: {
      id: 'seed-sh-4',
      ideaId: idea4.id,
      fromStatus: 'SUBMITTED',
      toStatus: 'UNDER_REVIEW',
      adminId: admin.id,
      feedback: 'Opened by administrator for review.',
    },
  });

  await prisma.statusHistory.upsert({
    where: { id: 'seed-sh-5' },
    update: {},
    create: {
      id: 'seed-sh-5',
      ideaId: idea4.id,
      fromStatus: 'UNDER_REVIEW',
      toStatus: 'REJECTED',
      adminId: admin.id,
      feedback:
        'While creative, this approach introduces significant complexity, compliance risks, and environmental concerns.',
    },
  });

  console.log('  ✓ Status history entries created');
  console.log('\n✅  Seed complete!\n');
  console.log('   Admin:  admin@example.com   / Admin123!');
  console.log('   User 1: user1@example.com   / User1234!');
  console.log('   User 2: user2@example.com   / User5678!\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
