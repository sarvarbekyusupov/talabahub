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
  const email = data?.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.uz`;

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

  return await prisma.category.create({
    data: {
      nameUz: category.name,
      nameEn: category.name,
      slug: category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
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
export async function createBrand(categoryId?: number, data?: Partial<any>) {
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

  return await prisma.brand.create({
    data: {
      name: brandName,
      slug: brandName.toLowerCase().replace(/\s+/g, '-'),
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

  return await prisma.company.create({
    data: {
      name: companyName,
      slug: companyName.toLowerCase().replace(/\s+/g, '-'),
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

export { prisma };
