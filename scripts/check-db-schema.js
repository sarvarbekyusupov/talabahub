#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');

  try {
    // Check Events table
    console.log('📅 Events Table:');
    try {
      const eventColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'events'
        ORDER BY ordinal_position;
      `;
      console.log('✅ Events columns:', eventColumns.length);
      console.table(eventColumns);

      // Test queries
      const eventCount = await prisma.event.count();
      console.log(`✅ Total events: ${eventCount}`);

      // Try querying with eventStatus
      try {
        const eventsWithStatus = await prisma.event.findMany({
          select: { id: true, title: true, eventStatus: true, status: true },
          take: 5
        });
        console.log('✅ Events with eventStatus:', eventsWithStatus.length);
      } catch (e) {
        console.log('❌ eventStatus field not found:', e.message);
      }

    } catch (e) {
      console.log('❌ Events table error:', e.message);
    }

    // Check Brands table
    console.log('\n🏢 Brands Table:');
    try {
      const brandsCount = await prisma.brand.count();
      console.log(`✅ Total brands: ${brandsCount}`);

      const brandsWithLimit = await prisma.brand.findMany({
        take: 5
      });
      console.log('✅ Sample brands query works:', brandsWithLimit.length);
    } catch (e) {
      console.log('❌ Brands table error:', e.message);
    }

    // Check Users table for verification fields
    console.log('\n👥 Users Verification Fields:');
    try {
      const userColumns = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name LIKE '%verification%'
        ORDER BY column_name;
      `;
      console.log('✅ Verification columns:', userColumns.length);
      console.table(userColumns);
    } catch (e) {
      console.log('❌ Users verification check error:', e.message);
    }

    // Check Jobs table
    console.log('\n💼 Jobs Table:');
    try {
      const jobColumns = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'jobs'
        ORDER BY ordinal_position;
      `;
      console.log('✅ Jobs columns:', jobColumns.length);
      console.table(jobColumns.slice(0, 10)); // Show first 10
    } catch (e) {
      console.log('❌ Jobs table error:', e.message);
    }

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema().catch(console.error);