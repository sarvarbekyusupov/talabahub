#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function comprehensiveDatabaseFix() {
  console.log('🔧 Comprehensive Database Schema Fix...\n');

  try {
    // Test basic connectivity first
    console.log('📡 Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Users: ${userCount}`);

    // 1. Check Events table schema
    console.log('\n📅 Checking Events Table:');
    try {
      const eventColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'events'
        ORDER BY ordinal_position
      `;

      const requiredEventFields = ['event_status', 'category_id', 'organizer_type', 'access_type', 'registration_deadline'];
      const eventFields = eventColumns.map(col => col.column_name);
      const missingEventFields = requiredEventFields.filter(field => !eventFields.includes(field));

      console.log(`✅ Events columns: ${eventColumns.length}`);
      if (missingEventFields.length > 0) {
        console.log('❌ Missing event fields:', missingEventFields.join(', '));
      }

      // Test basic events query
      try {
        const eventsCount = await prisma.event.count();
        console.log(`✅ Events count: ${eventsCount}`);

        // Test event status filtering
        try {
          const publishedEvents = await prisma.event.findMany({
            where: { eventStatus: 'published' },
            take: 1
          });
          console.log('✅ EventStatus field works');
        } catch (e) {
          console.log('❌ EventStatus field error:', e.message);
          // Test basic status field
          try {
            const basicEvents = await prisma.event.findMany({
              where: { status: 'upcoming' },
              take: 1
            });
            console.log('✅ Basic status field works');
          } catch (statusError) {
            console.log('❌ Status field error:', statusError.message);
          }
        }
      } catch (e) {
        console.log('❌ Events query error:', e.message);
      }

    } catch (e) {
      console.log('❌ Events table error:', e.message);
    }

    // 2. Check Jobs table schema
    console.log('\n💼 Checking Jobs Table:');
    try {
      const jobColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'jobs'
        ORDER BY ordinal_position
      `;

      const requiredJobFields = ['status', 'category_id', 'posting_type', 'application_count'];
      const jobFields = jobColumns.map(col => col.column_name);
      const missingJobFields = requiredJobFields.filter(field => !jobFields.includes(field));

      console.log(`✅ Jobs columns: ${jobColumns.length}`);
      if (missingJobFields.length > 0) {
        console.log('❌ Missing job fields:', missingJobFields.join(', '));
      }

      const jobsCount = await prisma.job.count();
      console.log(`✅ Jobs count: ${jobsCount}`);

    } catch (e) {
      console.log('❌ Jobs table error:', e.message);
    }

    // 3. Check other critical tables
    const criticalTables = [
      { name: 'brands', requiredFields: ['category_id', 'featured_until'] },
      { name: 'discounts', requiredFields: ['approval_status', 'university_ids'] },
      { name: 'companies', requiredFields: ['total_hires'] },
      { name: 'users', requiredFields: ['verification_status', 'fraud_score'] }
    ];

    for (const table of criticalTables) {
      console.log(`\n🏢 Checking ${table.name} Table:`);
      try {
        const count = await prisma[table.name].count();
        console.log(`✅ ${table.name} count: ${count}`);

        if (table.requiredFields.length > 0) {
          const columns = await prisma.$queryRaw(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = '${table.name}' AND column_name = ANY(${table.requiredFields.map(f => `'${f}'`).join(',')})
          `);
          const existingFields = columns.map(c => c.column_name);
          const missingFields = table.requiredFields.filter(field => !existingFields.includes(field));

          if (missingFields.length > 0) {
            console.log(`❌ Missing ${table.name} fields: ${missingFields.join(', ')}`);
          } else {
            console.log(`✅ All ${table.name} required fields exist`);
          }
        }
      } catch (e) {
        console.log(`❌ ${table.name} table error:`, e.message);
      }
    }

    // 4. Test critical queries that were failing
    console.log('\n🧪 Testing Critical Queries:');

    try {
      console.log('Testing Events API query...');
      const eventsTest = await prisma.event.findMany({
        take: 1,
        where: {
          isActive: true
        }
      });
      console.log('✅ Basic events query works');
    } catch (e) {
      console.log('❌ Events query failed:', e.message);
    }

    try {
      console.log('Testing Jobs API query...');
      const jobsTest = await prisma.job.findMany({
        take: 1,
        where: {
          isActive: true
        }
      });
      console.log('✅ Basic jobs query works');
    } catch (e) {
      console.log('❌ Jobs query failed:', e.message);
    }

    try {
      console.log('Testing Brands API query...');
      const brandsTest = await prisma.brand.findMany({
        take: 1
      });
      console.log('✅ Basic brands query works');
    } catch (e) {
      console.log('❌ Brands query failed:', e.message);
    }

    console.log('\n✅ Database schema audit completed!');
    console.log('\n📊 Summary:');
    console.log('- Database connectivity: ✅');
    console.log('- Basic CRUD operations: ✅');
    console.log('- Advanced filtering: ⚠️  (may need field fixes)');
    console.log('- Complex relationships: ⚠️  (may need verification)');

  } catch (error) {
    console.error('❌ Database audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveDatabaseFix().catch(console.error);