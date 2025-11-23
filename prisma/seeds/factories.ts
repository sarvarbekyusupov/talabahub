import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Factory functions for creating seed data
 */

// Generate random Uzbek names
const uzbekFirstNames = [
  'Sardor', 'Aziz', 'Javohir', 'Bekzod', 'Otabek',
  'Dilnoza', 'Sevara', 'Madina', 'Nilufar', 'Zarina',
  'Akmal', 'Farrux', 'Jasur', 'Nodir', 'Rustam',
  'Gulnoza', 'Kamola', 'Malika', 'Shahzoda', 'Yulduz',
];

const uzbekLastNames = [
  'Yusupov', 'Karimov', 'Rahimov', 'Saidov', 'Toshmatov',
  'Kholmatov', 'Ismoilov', 'Mahmudov', 'Nurmatov', 'Ergashev',
  'Azimov', 'Bekmurodov', 'Juraev', 'Xoliqov', 'Shokirov',
];

const uzbekCities = [
  'Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Namangan',
  'Fergana', 'Nukus', 'Urgench', 'Qarshi', 'Termez',
];

// Helper functions
function randomElement<T>(array: readonly T[] | T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * University Factory
 */
export async function createUniversity(data?: Partial<any>) {
  const { name, ...restData } = data || {};
  const universityName = name || `${randomElement(uzbekCities)} State University`;

  return await prisma.university.create({
    data: {
      nameUz: universityName,
      nameEn: universityName,
      address: `${randomInt(1, 100)} ${randomElement(['Amir Temur', 'Navoi', 'Buyuk Ipak Yoli'])} Street`,
      city: data?.city || randomElement(uzbekCities),
      region: randomElement(uzbekCities),
      website: `https://${universityName.toLowerCase().replace(/\s+/g, '')}.uz`,
      logoUrl: `https://via.placeholder.com/200x200?text=University`,
      ...restData,
    },
  });
}

/**
 * User Factory (Student)
 */
export async function createUser(data?: Partial<any>) {
  const firstName = randomElement(uzbekFirstNames);
  const lastName = randomElement(uzbekLastNames);
  const uniqueId = randomInt(1000, 9999);
  const email = data?.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uniqueId}@student.uz`;

  // Get or create a random university
  let university = data?.university;
  if (!university) {
    const universities = await prisma.university.findMany();
    if (universities.length > 0) {
      university = randomElement(universities);
    } else {
      university = await createUniversity();
    }
  }

  return await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Password123!', 10),
      firstName,
      lastName,
      phone: `+998${randomInt(90, 99)}${randomInt(1000000, 9999999)}`,
      dateOfBirth: new Date(randomInt(1995, 2005), randomInt(0, 11), randomInt(1, 28)),
      gender: randomElement(['male', 'female']),
      universityId: university.id,
      studentIdNumber: `STU${randomInt(100000, 999999)}`,
      courseYear: randomInt(1, 4),
      graduationYear: randomInt(2022, 2028),
      faculty: randomElement(['Computer Science', 'Engineering', 'Business', 'Medicine', 'Law']),
      verificationStatus: randomElement(['pending', 'verified', 'rejected']),
      role: 'student',
      ...data,
    },
  });
}

/**
 * Category Factory
 */
export async function createCategory(data?: Partial<any>) {
  const { name, icon, description, ...restData } = data || {};

  const categories = [
    { name: 'Food & Drinks', icon: '🍔', description: 'Restaurants, cafes, and food delivery' },
    { name: 'Shopping', icon: '🛍️', description: 'Fashion, electronics, and retail' },
    { name: 'Education', icon: '📚', description: 'Courses, books, and learning materials' },
    { name: 'Entertainment', icon: '🎬', description: 'Movies, concerts, and events' },
    { name: 'Travel', icon: '✈️', description: 'Hotels, flights, and tours' },
    { name: 'Health & Fitness', icon: '💪', description: 'Gyms, sports, and wellness' },
    { name: 'Technology', icon: '💻', description: 'Software, gadgets, and services' },
  ];

  const category = name ? { name, icon: icon || '🏷️', description } : randomElement(categories);
  const uniqueSlug = `${category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}-${randomInt(1000, 9999)}`;

  return await prisma.category.create({
    data: {
      nameUz: category.name,
      nameEn: category.name,
      slug: uniqueSlug,
      description: category.description,
      icon: category.icon,
      isActive: true,
      ...restData,
    },
  });
}

/**
 * Brand Factory
 */
export async function createBrand(categoryId?: number, data?: Partial<any>, index?: number) {
  const { name, ...restData } = data || {};

  const brands = [
    'MaxWay', 'Evos', 'KFC', 'Burger King', 'Pizza Hut',
    'Artel', 'Samsung', 'Xiaomi', 'Nike', 'Adidas',
    'Zara', 'H&M', 'Uzum Market', 'Asaxiy', 'Mediapark',
  ];

  const category = categoryId ? { id: categoryId } : await (async () => {
    const categories = await prisma.category.findMany();
    return categories.length > 0 ? randomElement(categories) : await createCategory();
  })();

  const brandName = name || randomElement(brands);
  const slugBase = brandName.toLowerCase().replace(/\s+/g, '-');
  const slug = index !== undefined ? `${slugBase}-${index}` : slugBase;

  return await prisma.brand.create({
    data: {
      name: brandName,
      slug,
      description: `Leading brand offering quality products and services`,
      logoUrl: `https://via.placeholder.com/200x200?text=${brandName}`,
      website: `https://${brandName.toLowerCase()}.uz`,
      categoryId: category.id,
      isActive: true,
      ...restData,
    },
  });
}

/**
 * Discount Factory
 */
export async function createDiscount(data?: Partial<any>) {
  const brand = data?.brand || await (async () => {
    const brands = await prisma.brand.findMany();
    return brands.length > 0 ? randomElement(brands) : await createBrand();
  })();

  const discountTypes = ['percentage', 'fixed_amount', 'promo_code'] as const;
  const type = randomElement(discountTypes) as 'percentage' | 'fixed_amount' | 'promo_code';

  const discountValue = type === 'percentage' ? randomInt(10, 50) : randomInt(5000, 50000);

  return await prisma.discount.create({
    data: {
      title: `${discountValue} ${type === 'percentage' ? '%' : 'UZS'} off at ${brand.name}`,
      description: `Get amazing discounts on all products and services`,
      brandId: brand.id,
      discountType: type as any,
      discountValue: discountValue,
      minPurchaseAmount: randomBoolean() ? randomInt(10000, 100000) : null,
      startDate: new Date(),
      endDate: new Date(Date.now() + randomInt(7, 90) * 24 * 60 * 60 * 1000),
      isActive: true,
      totalUsageLimit: randomBoolean() ? randomInt(100, 1000) : null,
      universityIds: [],
      ...data,
    },
  });
}

/**
 * Company Factory
 */
export async function createCompany(data?: Partial<any>) {
  const { name, ...restData } = data || {};

  const companies = [
    'UZINFOCOM', 'Uztelecom', 'Unitel', 'TechnoLab', 'IT Park',
    'Uzsoft', 'Digital City', 'Smart Solutions', 'InnoTech', 'CodeCraft',
  ];

  const companyName = name || randomElement(companies);
  const uniqueSlug = `${companyName.toLowerCase().replace(/\s+/g, '-')}-${randomInt(1000, 9999)}`;

  return await prisma.company.create({
    data: {
      name: companyName,
      slug: uniqueSlug,
      description: `Leading technology company in Uzbekistan`,
      logoUrl: `https://via.placeholder.com/200x200?text=${companyName}`,
      website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.uz`,
      industry: randomElement(['IT', 'Telecommunications', 'Software', 'Consulting']),
      companySize: randomElement(['10-50', '50-100', '100-500']),
      foundedYear: randomInt(2000, 2020),
      address: `${randomInt(1, 100)} ${randomElement(['Amir Temur', 'Navoi'])} Street, Tashkent`,
      isActive: true,
      ...restData,
    },
  });
}

/**
 * Job Factory
 */
export async function createJob(data?: Partial<any>) {
  const company = data?.company || await (async () => {
    const companies = await prisma.company.findMany();
    return companies.length > 0 ? randomElement(companies) : await createCompany();
  })();

  const jobTitles = [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Mobile Developer', 'DevOps Engineer', 'Data Analyst',
    'UI/UX Designer', 'Product Manager', 'QA Engineer',
  ];

  const title = randomElement(jobTitles);

  return await prisma.job.create({
    data: {
      title,
      description: `We are looking for talented ${title} to join our team`,
      companyId: company.id,
      location: randomElement(uzbekCities),
      jobType: randomElement(['full_time', 'part_time', 'internship', 'freelance']),
      salaryMin: randomInt(5000000, 15000000),
      salaryMax: randomInt(15000000, 50000000),
      applicationDeadline: new Date(Date.now() + randomInt(14, 60) * 24 * 60 * 60 * 1000),
      requiredSkills: ['JavaScript', 'TypeScript'],
      preferredSkills: ['React', 'Node.js'],
      languages: ['English', 'Uzbek'],
      isActive: true,
      ...data,
    },
  });
}

/**
 * Event Factory
 */
export async function createEvent(data?: Partial<any>) {
  const eventTypes = [
    'Tech Conference', 'Hackathon', 'Workshop', 'Seminar',
    'Career Fair', 'Networking Event', 'Training Session',
  ];

  const type = randomElement(eventTypes);
  const startDate = new Date(Date.now() + randomInt(7, 60) * 24 * 60 * 60 * 1000);

  return await prisma.event.create({
    data: {
      title: `${type} ${randomInt(2024, 2025)}`,
      slug: `${type.toLowerCase().replace(/\s+/g, '-')}-${randomInt(1000, 9999)}`,
      description: `Join us for an exciting ${type} event`,
      startDate,
      endDate: new Date(startDate.getTime() + randomInt(2, 8) * 60 * 60 * 1000),
      location: `${randomElement(uzbekCities)} Conference Center`,
      maxParticipants: randomInt(50, 500),
      isOnline: randomBoolean(0.3),
      meetingLink: randomBoolean(0.3) ? 'https://zoom.us/j/123456789' : null,
      isFree: !randomBoolean(0.2),
      ticketPrice: randomBoolean(0.2) ? randomInt(50000, 500000) : null,
      isActive: true,
      ...data,
    },
  });
}

/**
 * Education Partner Factory
 */
export async function createEducationPartner(data?: Partial<any>) {
  const { name, ...restData } = data || {};

  const partners = [
    'IT Park Academy', 'Najot Ta\'lim', 'PDP Academy', 'Proweb', 'Inha University',
    'Westminster International University', 'TEAM University', 'WIUT', 'CodeCraft Academy',
  ];

  const partnerName = name || randomElement(partners);

  return await prisma.educationPartner.create({
    data: {
      name: partnerName,
      slug: `${partnerName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}-${randomInt(100, 999)}`,
      description: `Quality education and training programs`,
      logoUrl: `https://via.placeholder.com/200x200?text=${partnerName}`,
      website: `https://${partnerName.toLowerCase().replace(/\s+/g, '').replace(/'/g, '')}.uz`,
      email: `info@${partnerName.toLowerCase().replace(/\s+/g, '').replace(/'/g, '')}.uz`,
      phone: `+998${randomInt(90, 99)}${randomInt(1000000, 9999999)}`,
      address: `${randomInt(1, 100)} ${randomElement(['Amir Temur', 'Navoi'])} Street, Tashkent`,
      rating: randomInt(40, 50) / 10,
      isActive: true,
      isVerified: randomBoolean(0.8),
      ...restData,
    },
  });
}

/**
 * Course Factory
 */
export async function createCourse(partnerId?: number, data?: Partial<any>) {
  const partner = partnerId ? { id: partnerId } : await (async () => {
    const partners = await prisma.educationPartner.findMany();
    return partners.length > 0 ? randomElement(partners) : await createEducationPartner();
  })();

  const courseNames = [
    'Full Stack Web Development',
    'Frontend Development with React',
    'Backend Development with Node.js',
    'Mobile Development with Flutter',
    'Data Science with Python',
    'UI/UX Design Fundamentals',
    'DevOps Engineering',
    'Cybersecurity Basics',
  ];

  const title = data?.title || randomElement(courseNames);
  const level = randomElement(['beginner', 'intermediate', 'advanced']);
  const originalPrice = randomInt(500000, 5000000);

  return await prisma.course.create({
    data: {
      partnerId: partner.id,
      title,
      slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${randomInt(1000, 9999)}`,
      description: `Comprehensive ${level} level course in ${title}`,
      syllabus: `Week 1-4: Fundamentals\nWeek 5-8: Advanced Topics\nWeek 9-12: Projects`,
      learningOutcomes: ['Master the fundamentals', 'Build real-world projects', 'Get job-ready skills'],
      thumbnailUrl: `https://via.placeholder.com/400x300?text=${title}`,
      level: level as any,
      durationHours: randomInt(40, 200),
      durationWeeks: randomInt(8, 24),
      language: randomElement(['uz', 'ru', 'en']),
      originalPrice,
      discountPrice: randomBoolean(0.5) ? originalPrice * 0.8 : null,
      discountPercentage: randomBoolean(0.5) ? 20 : null,
      prerequisites: level === 'beginner' ? [] : ['Basic programming knowledge'],
      targetAudience: ['Students', 'Career changers', 'Professionals'],
      startDate: new Date(Date.now() + randomInt(7, 60) * 24 * 60 * 60 * 1000),
      rating: randomInt(40, 50) / 10,
      isActive: true,
      isFeatured: randomBoolean(0.2),
      ...data,
    },
  });
}

/**
 * Course Enrollment Factory
 */
export async function createCourseEnrollment(userId?: string, courseId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const course = courseId ? { id: courseId } : await (async () => {
    const courses = await prisma.course.findMany();
    return courses.length > 0 ? randomElement(courses) : await createCourse();
  })();

  return await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      userId: user.id,
      amountPaid: randomInt(500000, 3000000),
      commissionEarned: randomInt(50000, 300000),
      paymentMethod: randomElement(['payme', 'click', 'uzcard', 'humo']),
      transactionId: `TXN${randomInt(100000, 999999)}`,
      progressPercentage: randomInt(0, 100),
      status: randomElement(['active', 'completed', 'suspended']),
      ...data,
    },
  });
}

/**
 * Discount Usage Factory
 */
export async function createDiscountUsage(userId?: string, discountId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const discount = discountId ? { id: discountId } : await (async () => {
    const discounts = await prisma.discount.findMany();
    return discounts.length > 0 ? randomElement(discounts) : await createDiscount();
  })();

  const transactionAmount = randomInt(50000, 500000);
  const discountAmount = transactionAmount * 0.2;

  return await prisma.discountUsage.create({
    data: {
      discountId: discount.id,
      userId: user.id,
      transactionAmount,
      discountAmount,
      commissionEarned: discountAmount * 0.1,
      deviceType: randomElement(['mobile', 'desktop', 'tablet']),
      isVerified: randomBoolean(0.8),
      ...data,
    },
  });
}

/**
 * Job Application Factory
 */
export async function createJobApplication(userId?: string, jobId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const job = jobId ? { id: jobId } : await (async () => {
    const jobs = await prisma.job.findMany();
    return jobs.length > 0 ? randomElement(jobs) : await createJob();
  })();

  return await prisma.jobApplication.create({
    data: {
      jobId: job.id,
      userId: user.id,
      cvUrl: 'https://example.com/cv.pdf',
      coverLetter: 'I am very interested in this position...',
      expectedSalary: randomInt(5000000, 20000000),
      status: randomElement(['pending', 'reviewed', 'interview', 'accepted', 'rejected']),
      ...data,
    },
  });
}

/**
 * Event Registration Factory
 */
export async function createEventRegistration(userId?: string, eventId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const event = eventId ? { id: eventId } : await (async () => {
    const events = await prisma.event.findMany();
    return events.length > 0 ? randomElement(events) : await createEvent();
  })();

  return await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: user.id,
      registrationStatus: randomElement(['registered', 'attended', 'cancelled']),
      confirmationCode: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      amountPaid: randomBoolean(0.3) ? randomInt(50000, 200000) : null,
      paymentMethod: randomBoolean(0.3) ? randomElement(['payme', 'click']) : null,
      ...data,
    },
  });
}

/**
 * Review Factory
 */
export async function createReview(userId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const reviewableType = randomElement(['Brand', 'Course', 'Company']);
  const reviewableId = `${randomInt(1, 100)}`;

  return await prisma.review.create({
    data: {
      userId: user.id,
      reviewableType,
      reviewableId,
      rating: randomInt(3, 5),
      title: 'Great experience!',
      comment: 'I had a wonderful experience with this service.',
      pros: 'Excellent quality and service',
      cons: 'Could be more affordable',
      isVerified: randomBoolean(0.7),
      isApproved: true,
      helpfulCount: randomInt(0, 50),
      ...data,
    },
  });
}

/**
 * Blog Post Factory
 */
export async function createBlogPost(authorId?: string, data?: Partial<any>) {
  const author: { id: string } | null = authorId ? { id: authorId } : await (async () => {
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    return admins.length > 0 ? randomElement(admins) : null;
  })();

  const titles = [
    'Top 10 Student Discounts in Tashkent',
    'How to Find Internships as a Student',
    'Best Online Courses for Career Growth',
    'Student Job Market Trends 2024',
    'Tips for Successful Job Applications',
  ];

  const title = randomElement(titles);

  return await prisma.blogPost.create({
    data: {
      authorId: author?.id,
      title,
      slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${randomInt(1000, 9999)}`,
      excerpt: 'Learn more about opportunities for students...',
      content: `<h1>${title}</h1><p>This is a comprehensive guide about ${title.toLowerCase()}.</p>`,
      featuredImage: 'https://via.placeholder.com/800x400?text=Blog',
      metaTitle: title,
      metaDescription: `Read about ${title.toLowerCase()}`,
      metaKeywords: ['student', 'discounts', 'jobs'],
      viewCount: randomInt(0, 1000),
      readTimeMinutes: randomInt(3, 10),
      status: 'published',
      featured: randomBoolean(0.2),
      publishedAt: new Date(),
      ...data,
    },
  });
}

/**
 * Notification Factory
 */
export async function createNotification(userId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  return await prisma.notification.create({
    data: {
      userId: user.id,
      type: randomElement(['email', 'sms', 'push', 'in_app']),
      title: 'New Discount Available!',
      message: 'Check out our latest student discounts',
      status: randomElement(['pending', 'sent', 'read']),
      sentAt: randomBoolean(0.7) ? new Date() : null,
      ...data,
    },
  });
}

/**
 * Transaction Factory
 */
export async function createTransaction(userId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  return await prisma.transaction.create({
    data: {
      userId: user.id,
      type: randomElement(['discount_usage', 'course_enrollment', 'event_registration']),
      amount: randomInt(10000, 500000),
      currency: 'UZS',
      paymentMethod: randomElement(['payme', 'click', 'uzcard', 'humo']),
      paymentProvider: randomElement(['payme', 'click']),
      externalTransactionId: `EXT${randomInt(100000, 999999)}`,
      status: randomElement(['pending', 'completed', 'failed']),
      completedAt: randomBoolean(0.8) ? new Date() : null,
      ...data,
    },
  });
}

/**
 * Analytics Event Factory
 */
export async function createAnalyticsEvent(userId?: string, data?: Partial<any>) {
  const user: { id: string } | null = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : null;
  })();

  return await prisma.analyticsEvent.create({
    data: {
      userId: user?.id,
      eventName: randomElement(['page_view', 'discount_view', 'discount_click', 'job_view']),
      eventCategory: randomElement(['engagement', 'conversion', 'navigation']),
      eventLabel: randomElement(['home_page', 'discounts_page', 'jobs_page']),
      eventValue: randomInt(1, 100),
      pageUrl: '/discounts',
      deviceType: randomElement(['mobile', 'desktop', 'tablet']),
      browser: randomElement(['Chrome', 'Safari', 'Firefox']),
      os: randomElement(['Windows', 'MacOS', 'iOS', 'Android']),
      ...data,
    },
  });
}

/**
 * Saved Item Factory
 */
export async function createSavedItem(userId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const saveableType = randomElement(['Discount', 'Job', 'Event', 'Course']);
  const saveableId = `${randomInt(1, 100)}`;

  return await prisma.savedItem.create({
    data: {
      userId: user.id,
      saveableType,
      saveableId,
      ...data,
    },
  });
}

/**
 * Admin Log Factory
 */
export async function createAdminLog(adminId?: string, data?: Partial<any>) {
  const admin = adminId ? { id: adminId } : await (async () => {
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    return admins.length > 0 ? randomElement(admins) : await createUser({ role: 'admin' });
  })();

  return await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: randomElement(['create', 'update', 'delete', 'approve']),
      resourceType: randomElement(['User', 'Discount', 'Brand', 'Job']),
      resourceId: `${randomInt(1, 100)}`,
      oldValues: { status: 'pending' },
      newValues: { status: 'approved' },
      ...data,
    },
  });
}

/**
 * Subscription Factory
 */
export async function createSubscription(userId?: string, data?: Partial<any>) {
  const user = userId ? { id: userId } : await (async () => {
    const users = await prisma.user.findMany();
    return users.length > 0 ? randomElement(users) : await createUser();
  })();

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  return await prisma.subscription.create({
    data: {
      userId: user.id,
      planName: randomElement(['basic', 'premium', 'enterprise']),
      price: randomInt(50000, 200000),
      startDate,
      endDate,
      status: randomElement(['active', 'cancelled', 'expired']),
      autoRenew: randomBoolean(0.7),
      nextBillingDate: endDate,
      ...data,
    },
  });
}

export { prisma };
