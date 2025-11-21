import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDiscounts() {
  console.log('Seeding discount system data...');

  // First, ensure we have some brands and categories
  const brand1 = await prisma.brand.upsert({
    where: { slug: 'max-way' },
    update: {},
    create: {
      name: 'Max Way',
      slug: 'max-way',
      logoUrl: 'https://example.com/maxway-logo.png',
      description: 'Fast food restaurant chain',
      website: 'https://maxway.uz',
      contactEmail: 'info@maxway.uz',
      contactPhone: '+998901234567',
      commissionRate: 5.0,
      isActive: true,
      isFeatured: true,
    },
  });

  const brand2 = await prisma.brand.upsert({
    where: { slug: 'evos' },
    update: {},
    create: {
      name: 'Evos',
      slug: 'evos',
      logoUrl: 'https://example.com/evos-logo.png',
      description: 'Fast food and delivery',
      website: 'https://evos.uz',
      contactEmail: 'info@evos.uz',
      contactPhone: '+998901234568',
      commissionRate: 7.0,
      isActive: true,
      isFeatured: true,
    },
  });

  const brand3 = await prisma.brand.upsert({
    where: { slug: 'chopar-pizza' },
    update: {},
    create: {
      name: 'Chopar Pizza',
      slug: 'chopar-pizza',
      logoUrl: 'https://example.com/chopar-logo.png',
      description: 'Pizza delivery',
      website: 'https://chopar.uz',
      contactEmail: 'info@chopar.uz',
      contactPhone: '+998901234569',
      commissionRate: 6.0,
      isActive: true,
      isFeatured: false,
    },
  });

  const brand4 = await prisma.brand.upsert({
    where: { slug: 'korzinka' },
    update: {},
    create: {
      name: 'Korzinka',
      slug: 'korzinka',
      logoUrl: 'https://example.com/korzinka-logo.png',
      description: 'Supermarket chain',
      website: 'https://korzinka.uz',
      contactEmail: 'info@korzinka.uz',
      contactPhone: '+998901234570',
      commissionRate: 3.0,
      isActive: true,
      isFeatured: false,
    },
  });

  // Create categories
  const foodCategory = await prisma.category.upsert({
    where: { slug: 'food-drinks' },
    update: {},
    create: {
      nameUz: 'Ovqat va Ichimliklar',
      nameEn: 'Food & Drinks',
      nameRu: 'Еда и напитки',
      slug: 'food-drinks',
      icon: 'utensils',
      isActive: true,
    },
  });

  const shoppingCategory = await prisma.category.upsert({
    where: { slug: 'shopping' },
    update: {},
    create: {
      nameUz: 'Xaridlar',
      nameEn: 'Shopping',
      nameRu: 'Покупки',
      slug: 'shopping',
      icon: 'shopping-bag',
      isActive: true,
    },
  });

  // Update brands with categories
  await prisma.brand.update({
    where: { id: brand1.id },
    data: { categoryId: foodCategory.id },
  });
  await prisma.brand.update({
    where: { id: brand2.id },
    data: { categoryId: foodCategory.id },
  });
  await prisma.brand.update({
    where: { id: brand3.id },
    data: { categoryId: foodCategory.id },
  });
  await prisma.brand.update({
    where: { id: brand4.id },
    data: { categoryId: shoppingCategory.id },
  });

  // Get universities for targeting
  const universities = await prisma.university.findMany({ take: 5 });
  const universityIds = universities.map((u) => u.id);

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Create discounts with different types and configurations

  // 1. Percentage Discount - Featured, Approved
  const discount1 = await prisma.discount.create({
    data: {
      brandId: brand1.id,
      categoryId: foodCategory.id,
      title: '20% chegirma barcha burgerlarga',
      description: 'Max Way dan barcha burgerlarga 20% chegirma! Faqat talabalar uchun.',
      termsAndConditions: 'Faqat universitetda tasdiqlangan talabalar uchun. Boshqa chegirmalar bilan birga ishlamaydi.',
      howToUse: 'Kassada claim code ni ko\'rsating',
      imageUrl: 'https://example.com/burger-discount.jpg',
      discountType: 'percentage',
      discountValue: 20,
      minPurchaseAmount: 50000,
      maxDiscountAmount: 30000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 3,
      totalUsageLimit: 1000,
      usageLimitType: 'monthly',
      monthlyClaimLimit: 3,
      universityIds: universityIds.slice(0, 3),
      isActive: true,
      isFeatured: true,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'promo_code',
      claimExpiryHours: 24,
      requiresPartnerVerification: true,
      allowedCities: ['Toshkent', 'Samarqand'],
      seasonalTag: 'back_to_school',
      priorityScore: 80,
    },
  });

  // 2. Fixed Amount Discount - First time only
  const discount2 = await prisma.discount.create({
    data: {
      brandId: brand2.id,
      categoryId: foodCategory.id,
      title: '25,000 so\'m chegirma birinchi buyurtmaga',
      description: 'Evos dan birinchi buyurtmangizga 25,000 so\'m chegirma!',
      termsAndConditions: 'Faqat birinchi marta Evos dan buyurtma qilayotgan talabalar uchun.',
      howToUse: 'Ilovada promo code ni kiriting',
      imageUrl: 'https://example.com/evos-first-order.jpg',
      discountType: 'fixed_amount',
      discountValue: 25000,
      minPurchaseAmount: 60000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 1,
      totalUsageLimit: 500,
      usageLimitType: 'one_time',
      isFirstTimeOnly: true,
      isActive: true,
      isFeatured: true,
      isExclusive: true,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'promo_code',
      claimExpiryHours: 48,
      requiresPartnerVerification: true,
      seasonalTag: 'welcome',
      priorityScore: 90,
    },
  });

  // 3. BOGO - Buy One Get One
  const discount3 = await prisma.discount.create({
    data: {
      brandId: brand3.id,
      categoryId: foodCategory.id,
      title: '1 ta pizza ol, 2-sini bepul ol!',
      description: 'Chopar Pizza dan BOGO aksiyasi! 1 ta katta pizza oling, 2-sini bepul oling.',
      termsAndConditions: 'Faqat katta o\'lchamdagi pizzalarga. Dam olish kunlari amal qiladi.',
      howToUse: 'Buyurtma berishda ushbu aksiyani tanlang',
      imageUrl: 'https://example.com/chopar-bogo.jpg',
      discountType: 'buy_one_get_one',
      discountValue: 100,
      bogoProductName: 'Katta pizza',
      minPurchaseAmount: 80000,
      startDate: now,
      endDate: nextWeek,
      usageLimitPerUser: 2,
      totalUsageLimit: 200,
      usageLimitType: 'weekly',
      weeklyClaimLimit: 2,
      activeDaysOfWeek: [0, 6], // Sunday and Saturday only
      isActive: true,
      isFeatured: false,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'qr_code',
      claimExpiryHours: 12,
      requiresPartnerVerification: true,
      allowedCities: ['Toshkent'],
      seasonalTag: 'weekend_special',
      priorityScore: 70,
    },
  });

  // 4. Free Item
  const discount4 = await prisma.discount.create({
    data: {
      brandId: brand1.id,
      categoryId: foodCategory.id,
      title: 'Bepul Coca-Cola 0.5L',
      description: 'Max Way dan 100,000 so\'mdan ortiq buyurtmaga bepul Coca-Cola!',
      termsAndConditions: 'Minimum buyurtma 100,000 so\'m. Bir kunda faqat 1 marta.',
      howToUse: 'Kassaga claim code ni ko\'rsating',
      imageUrl: 'https://example.com/free-cola.jpg',
      discountType: 'free_item',
      discountValue: 0,
      freeItemName: 'Coca-Cola 0.5L',
      freeItemValue: 8000,
      minPurchaseAmount: 100000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 30,
      totalUsageLimit: 3000,
      usageLimitType: 'daily',
      dailyClaimLimit: 1,
      isActive: true,
      isFeatured: false,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'promo_code',
      claimExpiryHours: 6,
      requiresPartnerVerification: true,
      priorityScore: 50,
    },
  });

  // 5. Cashback
  const discount5 = await prisma.discount.create({
    data: {
      brandId: brand4.id,
      categoryId: shoppingCategory.id,
      title: '5% cashback barcha xaridlarga',
      description: 'Korzinka dan barcha xaridlarga 5% cashback! Cashback 3 kun ichida hisobingizga tushadi.',
      termsAndConditions: 'Minimum xarid 200,000 so\'m. Maximum cashback 50,000 so\'m.',
      howToUse: 'Kassada student ID ko\'rsating va TalabaHub accountingizni ulang',
      imageUrl: 'https://example.com/korzinka-cashback.jpg',
      discountType: 'cashback',
      discountValue: 0,
      cashbackPercentage: 5,
      maxCashbackAmount: 50000,
      cashbackDelayDays: 3,
      minPurchaseAmount: 200000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 10,
      totalUsageLimit: 5000,
      usageLimitType: 'monthly',
      monthlyClaimLimit: 10,
      universityIds: universityIds,
      isActive: true,
      isFeatured: true,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'student_card',
      claimExpiryHours: 72,
      requiresPartnerVerification: true,
      allowedCities: ['Toshkent', 'Samarqand', 'Buxoro', 'Farg\'ona'],
      priorityScore: 85,
    },
  });

  // 6. Time-Limited Discount (Lunch special)
  const discount6 = await prisma.discount.create({
    data: {
      brandId: brand2.id,
      categoryId: foodCategory.id,
      title: '15% chegirma tushlik vaqtida',
      description: 'Evos dan tushlik vaqtida (12:00-14:00) 15% chegirma!',
      termsAndConditions: 'Faqat soat 12:00 dan 14:00 gacha. Ish kunlarida.',
      howToUse: 'Kassada promo code ni aytib bering',
      imageUrl: 'https://example.com/evos-lunch.jpg',
      discountType: 'percentage',
      discountValue: 15,
      minPurchaseAmount: 40000,
      maxDiscountAmount: 20000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 20,
      totalUsageLimit: 2000,
      usageLimitType: 'daily',
      dailyClaimLimit: 1,
      activeTimeStart: '12:00',
      activeTimeEnd: '14:00',
      activeDaysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      isActive: true,
      isFeatured: false,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'promo_code',
      claimExpiryHours: 2,
      requiresPartnerVerification: true,
      seasonalTag: 'lunch_special',
      priorityScore: 60,
    },
  });

  // 7. Location-based Discount
  const discount7 = await prisma.discount.create({
    data: {
      brandId: brand3.id,
      categoryId: foodCategory.id,
      title: '30% chegirma - Yaqin filialda',
      description: 'Chopar Pizza filialiga 500m ichida bo\'lsangiz 30% chegirma!',
      termsAndConditions: 'GPS location tasdiqlanishi kerak. Faqat filialga yaqin joyda.',
      howToUse: 'Ilovada joylashuvingizni tasdiqlang va code oling',
      imageUrl: 'https://example.com/chopar-nearby.jpg',
      discountType: 'percentage',
      discountValue: 30,
      minPurchaseAmount: 50000,
      maxDiscountAmount: 40000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 5,
      totalUsageLimit: 500,
      usageLimitType: 'weekly',
      weeklyClaimLimit: 2,
      requiresLocation: true,
      locationLat: 41.2995,
      locationLng: 69.2401,
      locationRadius: 500,
      allowedCities: ['Toshkent'],
      isActive: true,
      isFeatured: false,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'qr_code',
      claimExpiryHours: 1,
      requiresPartnerVerification: true,
      priorityScore: 75,
    },
  });

  // 8. Referral Bonus Discount
  const discount8 = await prisma.discount.create({
    data: {
      brandId: brand1.id,
      categoryId: foodCategory.id,
      title: 'Do\'stingni olib kel - 40,000 so\'m',
      description: 'Do\'stingizni TalabaHub ga taklif qiling, ikkalangizga 40,000 so\'m chegirma!',
      termsAndConditions: 'Do\'stingiz birinchi marta ro\'yxatdan o\'tishi va xarid qilishi kerak.',
      howToUse: 'Referral link orqali do\'stingizni taklif qiling',
      imageUrl: 'https://example.com/refer-friend.jpg',
      discountType: 'fixed_amount',
      discountValue: 40000,
      isReferralBonus: true,
      referralBonusValue: 40000,
      minPurchaseAmount: 80000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 10,
      usageLimitType: 'unlimited',
      isActive: true,
      isFeatured: true,
      isExclusive: false,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'auto',
      claimExpiryHours: 168, // 1 week
      requiresPartnerVerification: false,
      seasonalTag: 'referral',
      priorityScore: 95,
    },
  });

  // 9. Pending Approval Discount
  const discount9 = await prisma.discount.create({
    data: {
      brandId: brand4.id,
      categoryId: shoppingCategory.id,
      title: '10% chegirma yangi kolleksiyaga',
      description: 'Korzinka yangi kuz kolleksiyasiga 10% chegirma',
      termsAndConditions: 'Faqat yangi mahsulotlarga amal qiladi.',
      howToUse: 'Kassada student ID ko\'rsating',
      imageUrl: 'https://example.com/korzinka-new.jpg',
      discountType: 'percentage',
      discountValue: 10,
      minPurchaseAmount: 100000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 3,
      totalUsageLimit: 1000,
      usageLimitType: 'monthly',
      monthlyClaimLimit: 3,
      specificProducts: ['Kiyim-kechak', 'Poyabzal', 'Sumkalar'],
      isActive: true,
      isFeatured: false,
      isExclusive: false,
      approvalStatus: 'pending', // Pending approval
      verificationMethod: 'student_card',
      claimExpiryHours: 24,
      requiresPartnerVerification: true,
      seasonalTag: 'fall_collection',
      priorityScore: 40,
    },
  });

  // 10. University-Specific Discount
  const discount10 = await prisma.discount.create({
    data: {
      brandId: brand2.id,
      categoryId: foodCategory.id,
      title: 'TATU studentlari uchun maxsus - 25% off',
      description: 'Faqat TATU studentlari uchun Evos dan 25% chegirma!',
      termsAndConditions: 'Faqat TATU da o\'qiyotgan va tasdiqlangan studentlar uchun.',
      howToUse: 'TATU student ID sini ko\'rsating',
      imageUrl: 'https://example.com/evos-tatu.jpg',
      discountType: 'percentage',
      discountValue: 25,
      minPurchaseAmount: 45000,
      maxDiscountAmount: 35000,
      startDate: now,
      endDate: nextMonth,
      usageLimitPerUser: 5,
      totalUsageLimit: 300,
      usageLimitType: 'monthly',
      monthlyClaimLimit: 5,
      universityIds: universityIds.slice(0, 1), // Only first university (assume it's TATU)
      minCourseYear: 2,
      isActive: true,
      isFeatured: false,
      isExclusive: true,
      approvalStatus: 'approved',
      approvedAt: now,
      verificationMethod: 'student_card',
      claimExpiryHours: 24,
      requiresPartnerVerification: true,
      priorityScore: 65,
    },
  });

  console.log('Created 10 sample discounts');

  // Create sample claims if we have users
  const users = await prisma.user.findMany({ take: 5, where: { role: 'student' } });

  if (users.length > 0) {
    // Create some sample claims
    for (let i = 0; i < Math.min(users.length, 3); i++) {
      const user = users[i];

      // Claimed discount
      await prisma.discountClaim.create({
        data: {
          discountId: discount1.id,
          userId: user.id,
          claimCode: `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2025`,
          status: 'claimed',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '192.168.1.1',
          deviceType: 'mobile',
        },
      });

      // Redeemed discount
      await prisma.discountClaim.create({
        data: {
          discountId: discount2.id,
          userId: user.id,
          claimCode: `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2025`,
          status: 'redeemed',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          redeemedAt: new Date(),
          transactionAmount: 85000,
          discountAmount: 25000,
          ipAddress: '192.168.1.2',
          deviceType: 'mobile',
        },
      });

      // Expired discount
      await prisma.discountClaim.create({
        data: {
          discountId: discount4.id,
          userId: user.id,
          claimCode: `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2025`,
          status: 'expired',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
          ipAddress: '192.168.1.3',
          deviceType: 'desktop',
        },
      });
    }

    console.log('Created sample discount claims');

    // Create a fraud alert
    if (users.length > 0) {
      await prisma.fraudAlert.create({
        data: {
          userId: users[0].id,
          discountId: discount1.id,
          alertType: 'unusual_pattern',
          status: 'pending',
          description: 'Multiple claims detected in short period',
          severity: 3,
          evidence: {
            claimsInLast5Minutes: 8,
            timestamp: new Date(),
          },
          ipAddress: '192.168.1.100',
        },
      });

      console.log('Created sample fraud alert');
    }
  }

  // Update discount counters
  await prisma.discount.update({
    where: { id: discount1.id },
    data: {
      viewCount: 1500,
      clickCount: 450,
      totalClaimsCount: 120,
      totalRedemptions: 85,
      totalSavingsGenerated: 2125000,
    },
  });

  await prisma.discount.update({
    where: { id: discount2.id },
    data: {
      viewCount: 2000,
      clickCount: 600,
      totalClaimsCount: 200,
      totalRedemptions: 150,
      totalSavingsGenerated: 3750000,
    },
  });

  await prisma.discount.update({
    where: { id: discount5.id },
    data: {
      viewCount: 800,
      clickCount: 200,
      totalClaimsCount: 50,
      totalRedemptions: 40,
      totalSavingsGenerated: 1800000,
    },
  });

  // Create partner analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.partnerAnalytics.create({
    data: {
      brandId: brand1.id,
      date: today,
      totalViews: 500,
      totalClicks: 150,
      totalClaims: 45,
      totalRedemptions: 32,
      totalRevenue: 3200000,
      totalCommission: 160000,
      claimRate: 9.0,
      redemptionRate: 71.1,
      topUniversities: [
        { name: 'TATU', count: 15 },
        { name: 'Westminster', count: 10 },
      ],
      peakHours: [
        { hour: 12, count: 12 },
        { hour: 13, count: 15 },
        { hour: 18, count: 8 },
      ],
    },
  });

  await prisma.partnerAnalytics.create({
    data: {
      brandId: brand2.id,
      date: today,
      totalViews: 650,
      totalClicks: 180,
      totalClaims: 60,
      totalRedemptions: 45,
      totalRevenue: 4500000,
      totalCommission: 315000,
      claimRate: 9.2,
      redemptionRate: 75.0,
      topUniversities: [
        { name: 'TATU', count: 20 },
        { name: 'MDIS', count: 12 },
      ],
      peakHours: [
        { hour: 12, count: 18 },
        { hour: 13, count: 20 },
        { hour: 19, count: 10 },
      ],
    },
  });

  console.log('Created partner analytics');

  console.log('Discount system seeding completed!');

  return {
    discounts: [discount1, discount2, discount3, discount4, discount5, discount6, discount7, discount8, discount9, discount10],
    brands: [brand1, brand2, brand3, brand4],
    categories: [foodCategory, shoppingCategory],
  };
}

// Export for use in main seed file
export { seedDiscounts };

// Run directly if called as main
async function main() {
  try {
    await seedDiscounts();
  } catch (error) {
    console.error('Error seeding discounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
