import { PrismaClient } from '@prisma/client';
import {
  createUniversity,
  createUser,
  createCategory,
  createBrand,
  createDiscount,
  createCompany,
  createJob,
  createEvent,
  prisma,
} from './seeds/factories';

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (optional - comment out for production)
  console.log('🗑️  Clearing existing data...');
  await prisma.event.deleteMany();
  await prisma.job.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.university.deleteMany();
  console.log('✅ Existing data cleared\n');

  // Seed Universities
  console.log('🎓 Creating universities...');
  const universities = await Promise.all([
    createUniversity({ name: 'Tashkent State University', city: 'Tashkent' }),
    createUniversity({ name: 'Samarkand State University', city: 'Samarkand' }),
    createUniversity({ name: 'Bukhara State University', city: 'Bukhara' }),
    createUniversity({ name: 'National University of Uzbekistan', city: 'Tashkent' }),
    createUniversity({ name: 'TUIT (Tashkent University of Information Technologies)', city: 'Tashkent' }),
  ]);
  console.log(`✅ Created ${universities.length} universities\n`);

  // Seed Categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    createCategory({ name: 'Food & Drinks', icon: '🍔' }),
    createCategory({ name: 'Shopping', icon: '🛍️' }),
    createCategory({ name: 'Education', icon: '📚' }),
    createCategory({ name: 'Entertainment', icon: '🎬' }),
    createCategory({ name: 'Travel', icon: '✈️' }),
    createCategory({ name: 'Health & Fitness', icon: '💪' }),
    createCategory({ name: 'Technology', icon: '💻' }),
  ]);
  console.log(`✅ Created ${categories.length} categories\n`);

  // Seed Brands
  console.log('🏷️  Creating brands...');
  const brands = [];
  for (let i = 0; i < 15; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = await createBrand(category.id);
    brands.push(brand);
  }
  console.log(`✅ Created ${brands.length} brands\n`);

  // Seed Discounts
  console.log('💰 Creating discounts...');
  const discounts = [];
  for (let i = 0; i < 25; i++) {
    const discount = await createDiscount();
    discounts.push(discount);
  }
  console.log(`✅ Created ${discounts.length} discounts\n`);

  // Seed Users (Students)
  console.log('👥 Creating users...');
  const users = [];
  for (let i = 0; i < 30; i++) {
    const user = await createUser();
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users\n`);

  // Seed Admin User
  console.log('👤 Creating admin user...');
  const admin = await createUser({
    email: 'admin@talabahub.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    verificationStatus: 'verified',
  });
  console.log(`✅ Created admin user (email: ${admin.email}, password: Password123!)\n`);

  // Seed Companies
  console.log('🏢 Creating companies...');
  const companies = [];
  for (let i = 0; i < 10; i++) {
    const company = await createCompany();
    companies.push(company);
  }
  console.log(`✅ Created ${companies.length} companies\n`);

  // Seed Jobs
  console.log('💼 Creating jobs...');
  const jobs = [];
  for (let i = 0; i < 20; i++) {
    const job = await createJob();
    jobs.push(job);
  }
  console.log(`✅ Created ${jobs.length} jobs\n`);

  // Seed Events
  console.log('🎉 Creating events...');
  const events = [];
  for (let i = 0; i < 15; i++) {
    const event = await createEvent();
    events.push(event);
  }
  console.log(`✅ Created ${events.length} events\n`);

  console.log('🎉 Seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${universities.length} universities`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${brands.length} brands`);
  console.log(`   - ${discounts.length} discounts`);
  console.log(`   - ${users.length + 1} users (${users.length} students + 1 admin)`);
  console.log(`   - ${companies.length} companies`);
  console.log(`   - ${jobs.length} jobs`);
  console.log(`   - ${events.length} events`);
  console.log('\n🔐 Admin credentials:');
  console.log(`   Email: admin@talabahub.com`);
  console.log(`   Password: Password123!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
