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
  createEducationPartner,
  createCourse,
  createCourseEnrollment,
  createDiscountUsage,
  createJobApplication,
  createEventRegistration,
  createReview,
  createBlogPost,
  createNotification,
  createTransaction,
  createAnalyticsEvent,
  createSavedItem,
  createAdminLog,
  createSubscription,
  prisma,
} from './seeds/factories';
import { seedBlogContent } from './seeds/blog-seed';

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (optional - comment out for production)
  console.log('🗑️  Clearing existing data...');
  // Delete in correct order to respect foreign key constraints

  // Blog content tables first
  await prisma.share.deleteMany();
  await prisma.report.deleteMany();
  await prisma.blogNotification.deleteMany();
  await prisma.articleView.deleteMany();
  await prisma.responseClap.deleteMany();
  await prisma.response.deleteMany();
  await prisma.clap.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.bookmarkCollection.deleteMany();
  await prisma.articleTag.deleteMany();
  await prisma.articleStats.deleteMany();
  await prisma.articleContent.deleteMany();
  await prisma.article.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.studentProfile.deleteMany();

  // Original tables
  await prisma.subscription.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.savedItem.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.review.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.discountUsage.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.educationPartner.deleteMany();
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
  const brands: any[] = [];
  for (let i = 0; i < 15; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = await createBrand(category.id, {}, i + 1);
    brands.push(brand);
  }
  console.log(`✅ Created ${brands.length} brands\n`);

  // Seed Discounts
  console.log('💰 Creating discounts...');
  const discounts: any[] = [];
  for (let i = 0; i < 25; i++) {
    const discount = await createDiscount();
    discounts.push(discount);
  }
  console.log(`✅ Created ${discounts.length} discounts\n`);

  // Seed Users (Students)
  console.log('👥 Creating users...');
  const users: any[] = [];
  for (let i = 0; i < 30; i++) {
    const user = await createUser();
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users\n`);

  // Seed Admin User (skip if exists)
  console.log('👤 Checking admin user...');
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@talabahub.com' } });
  if (!existingAdmin) {
    const admin = await createUser({
      email: 'admin@talabahub.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      verificationStatus: 'verified',
      isActive: true,
      isEmailVerified: true,
    });
    console.log(`✅ Created admin user (email: ${admin.email}, password: Password123!)\n`);
  } else {
    console.log(`✅ Admin user already exists\n`);
  }

  // Seed Companies
  console.log('🏢 Creating companies...');
  const companies: any[] = [];
  for (let i = 0; i < 10; i++) {
    const company = await createCompany();
    companies.push(company);
  }
  console.log(`✅ Created ${companies.length} companies\n`);

  // Seed Jobs
  console.log('💼 Creating jobs...');
  const jobs: any[] = [];
  for (let i = 0; i < 20; i++) {
    const job = await createJob();
    jobs.push(job);
  }
  console.log(`✅ Created ${jobs.length} jobs\n`);

  // Seed Events
  console.log('🎉 Creating events...');
  const events: any[] = [];
  for (let i = 0; i < 15; i++) {
    const event = await createEvent();
    events.push(event);
  }
  console.log(`✅ Created ${events.length} events\n`);

  // Seed Education Partners
  console.log('🎓 Creating education partners...');
  const educationPartners: any[] = [];
  for (let i = 0; i < 8; i++) {
    const partner = await createEducationPartner();
    educationPartners.push(partner);
  }
  console.log(`✅ Created ${educationPartners.length} education partners\n`);

  // Seed Courses
  console.log('📚 Creating courses...');
  const courses: any[] = [];
  for (let i = 0; i < 20; i++) {
    const course = await createCourse();
    courses.push(course);
  }
  console.log(`✅ Created ${courses.length} courses\n`);

  // Seed Discount Usages
  console.log('💳 Creating discount usages...');
  const discountUsages: any[] = [];
  for (let i = 0; i < 30; i++) {
    const discountUsage = await createDiscountUsage();
    discountUsages.push(discountUsage);
  }
  console.log(`✅ Created ${discountUsages.length} discount usages\n`);

  // Seed Course Enrollments
  console.log('📖 Creating course enrollments...');
  const courseEnrollments: any[] = [];
  for (let i = 0; i < 25; i++) {
    const enrollment = await createCourseEnrollment();
    courseEnrollments.push(enrollment);
  }
  console.log(`✅ Created ${courseEnrollments.length} course enrollments\n`);

  // Seed Job Applications
  console.log('📝 Creating job applications...');
  const jobApplications: any[] = [];
  for (let i = 0; i < 30; i++) {
    const application = await createJobApplication();
    jobApplications.push(application);
  }
  console.log(`✅ Created ${jobApplications.length} job applications\n`);

  // Seed Event Registrations
  console.log('🎫 Creating event registrations...');
  const eventRegistrations: any[] = [];
  for (let i = 0; i < 25; i++) {
    const registration = await createEventRegistration();
    eventRegistrations.push(registration);
  }
  console.log(`✅ Created ${eventRegistrations.length} event registrations\n`);

  // Seed Reviews
  console.log('⭐ Creating reviews...');
  const reviews: any[] = [];
  for (let i = 0; i < 40; i++) {
    const review = await createReview();
    reviews.push(review);
  }
  console.log(`✅ Created ${reviews.length} reviews\n`);

  // Seed Blog Posts
  console.log('📰 Creating blog posts...');
  const blogPosts: any[] = [];
  for (let i = 0; i < 12; i++) {
    const blogPost = await createBlogPost();
    blogPosts.push(blogPost);
  }
  console.log(`✅ Created ${blogPosts.length} blog posts\n`);

  // Seed Notifications
  console.log('🔔 Creating notifications...');
  const notifications: any[] = [];
  for (let i = 0; i < 35; i++) {
    const notification = await createNotification();
    notifications.push(notification);
  }
  console.log(`✅ Created ${notifications.length} notifications\n`);

  // Seed Transactions
  console.log('💰 Creating transactions...');
  const transactions: any[] = [];
  for (let i = 0; i < 30; i++) {
    const transaction = await createTransaction();
    transactions.push(transaction);
  }
  console.log(`✅ Created ${transactions.length} transactions\n`);

  // Seed Analytics Events
  console.log('📊 Creating analytics events...');
  const analyticsEvents: any[] = [];
  for (let i = 0; i < 100; i++) {
    const analyticsEvent = await createAnalyticsEvent();
    analyticsEvents.push(analyticsEvent);
  }
  console.log(`✅ Created ${analyticsEvents.length} analytics events\n`);

  // Seed Saved Items
  console.log('💾 Creating saved items...');
  const savedItems: any[] = [];
  for (let i = 0; i < 20; i++) {
    const savedItem = await createSavedItem();
    savedItems.push(savedItem);
  }
  console.log(`✅ Created ${savedItems.length} saved items\n`);

  // Seed Admin Logs
  console.log('📋 Creating admin logs...');
  const adminLogs: any[] = [];
  for (let i = 0; i < 15; i++) {
    const adminLog = await createAdminLog();
    adminLogs.push(adminLog);
  }
  console.log(`✅ Created ${adminLogs.length} admin logs\n`);

  // Seed Subscriptions
  console.log('🔒 Creating subscriptions...');
  const subscriptions: any[] = [];
  for (let i = 0; i < 10; i++) {
    const subscription = await createSubscription();
    subscriptions.push(subscription);
  }
  console.log(`✅ Created ${subscriptions.length} subscriptions\n`);

  // Seed Blog Content (Articles, Tags, Profiles, etc.)
  await seedBlogContent();

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
  console.log(`   - ${educationPartners.length} education partners`);
  console.log(`   - ${courses.length} courses`);
  console.log(`   - ${discountUsages.length} discount usages`);
  console.log(`   - ${courseEnrollments.length} course enrollments`);
  console.log(`   - ${jobApplications.length} job applications`);
  console.log(`   - ${eventRegistrations.length} event registrations`);
  console.log(`   - ${reviews.length} reviews`);
  console.log(`   - ${blogPosts.length} blog posts`);
  console.log(`   - ${notifications.length} notifications`);
  console.log(`   - ${transactions.length} transactions`);
  console.log(`   - ${analyticsEvents.length} analytics events`);
  console.log(`   - ${savedItems.length} saved items`);
  console.log(`   - ${adminLogs.length} admin logs`);
  console.log(`   - ${subscriptions.length} subscriptions`);
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
