import { PrismaClient } from '@prisma/client';

// Temporary types matching actual Prisma schema enums
type TagCategory = 'study' | 'career' | 'life' | 'tech' | 'personal';
type ContentBlockType = 'paragraph' | 'heading' | 'image' | 'code' | 'quote' | 'list' | 'embed';

const prisma = new PrismaClient();

export async function seedBlogContent() {
  console.log('📝 Seeding blog content...');

  // Get existing users for authors
  const users = await prisma.user.findMany({
    take: 5,
    where: { role: 'student' },
  });

  if (users.length === 0) {
    console.log('⚠️  No users found, skipping blog seed');
    return;
  }

  // Create student profiles for users
  console.log('👤 Creating student profiles...');
  for (const user of users) {
    await prisma.studentProfile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        bio: `Student at university, passionate about technology and innovation.`,
        totalFollowers: Math.floor(Math.random() * 100),
        totalFollowing: Math.floor(Math.random() * 50),
      },
    });
  }

  // Create tags
  console.log('🏷️  Creating tags...');
  const tagData = [
    { name: 'Technology', slug: 'technology', category: 'tech' as TagCategory },
    { name: 'Programming', slug: 'programming', category: 'tech' as TagCategory },
    { name: 'Career', slug: 'career', category: 'career' as TagCategory },
    { name: 'Study Tips', slug: 'study-tips', category: 'study' as TagCategory },
    { name: 'University Life', slug: 'university-life', category: 'life' as TagCategory },
    { name: 'Internships', slug: 'internships', category: 'career' as TagCategory },
    { name: 'Startups', slug: 'startups', category: 'career' as TagCategory },
    { name: 'AI & ML', slug: 'ai-ml', category: 'tech' as TagCategory },
  ];

  const tags: any[] = [];
  for (const tag of tagData) {
    const created = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    tags.push(created);
  }

  // Create articles
  console.log('📄 Creating articles...');
  const articleData = [
    {
      title: 'Getting Started with Web Development in 2025',
      slug: 'getting-started-web-development-2025',
      subtitle: 'A comprehensive guide for beginners',
      status: 'published' as const,
      featured: true,
      tags: ['technology', 'programming'],
    },
    {
      title: 'How to Land Your First Tech Internship',
      slug: 'land-first-tech-internship',
      subtitle: 'Tips from students who made it',
      status: 'published' as const,
      featured: true,
      tags: ['career', 'internships'],
    },
    {
      title: '10 Study Hacks Every University Student Should Know',
      slug: '10-study-hacks-university-student',
      subtitle: 'Boost your productivity and grades',
      status: 'published' as const,
      featured: false,
      tags: ['study-tips', 'university-life'],
    },
    {
      title: 'Introduction to Machine Learning for Beginners',
      slug: 'introduction-machine-learning-beginners',
      subtitle: 'Understanding AI fundamentals',
      status: 'published' as const,
      featured: true,
      tags: ['ai-ml', 'technology'],
    },
    {
      title: 'Building Your First Startup While in University',
      slug: 'building-first-startup-university',
      subtitle: 'Balancing academics and entrepreneurship',
      status: 'published' as const,
      featured: false,
      tags: ['startups', 'career'],
    },
    {
      title: 'The Complete Guide to Git and GitHub',
      slug: 'complete-guide-git-github',
      subtitle: 'Version control for students',
      status: 'published' as const,
      featured: false,
      tags: ['programming', 'technology'],
    },
    {
      title: 'Preparing for Technical Interviews: A Student Guide',
      slug: 'preparing-technical-interviews-student-guide',
      subtitle: 'Crack the coding interview',
      status: 'published' as const,
      featured: false,
      tags: ['career', 'programming'],
    },
    {
      title: 'Making the Most of Your University Experience',
      slug: 'making-most-university-experience',
      subtitle: 'Beyond just attending classes',
      status: 'published' as const,
      featured: false,
      tags: ['university-life', 'study-tips'],
    },
    {
      title: 'Introduction to Cloud Computing for Students',
      slug: 'introduction-cloud-computing-students',
      subtitle: 'AWS, Azure, and GCP basics',
      status: 'published' as const,
      featured: false,
      tags: ['technology', 'programming'],
    },
    {
      title: 'How to Network Effectively as a Student',
      slug: 'network-effectively-student',
      subtitle: 'Building professional connections',
      status: 'published' as const,
      featured: false,
      tags: ['career', 'university-life'],
    },
    {
      title: 'The Future of AI in Education',
      slug: 'future-ai-education',
      subtitle: 'How AI is transforming learning',
      status: 'published' as const,
      featured: true,
      tags: ['ai-ml', 'technology'],
    },
    {
      title: 'Freelancing as a Student Developer',
      slug: 'freelancing-student-developer',
      subtitle: 'Earning while learning',
      status: 'published' as const,
      featured: false,
      tags: ['career', 'programming'],
    },
  ];

  const articles: any[] = [];
  for (let i = 0; i < articleData.length; i++) {
    const data = articleData[i];
    const author = users[i % users.length];

    const article = await prisma.article.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        authorId: author.id,
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle,
        status: data.status,
        featured: data.featured,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `Introduction to ${data.title}...` }],
            },
          ],
        },
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        readingTimeMinutes: Math.floor(Math.random() * 10) + 3,
      },
    });

    // Create article content blocks
    await prisma.articleContent.create({
      data: {
        articleId: article.id,
        blockType: 'paragraph' as ContentBlockType,
        content: {
          text: `This is the content for "${data.title}". Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        },
        position: 0,
      },
    });

    await prisma.articleContent.create({
      data: {
        articleId: article.id,
        blockType: 'heading' as ContentBlockType,
        content: {
          level: 2,
          text: 'Key Points',
        },
        position: 1,
      },
    });

    // Create article stats
    await prisma.articleStats.upsert({
      where: { articleId: article.id },
      update: {},
      create: {
        articleId: article.id,
        viewsCount: Math.floor(Math.random() * 1000),
        clapsCount: Math.floor(Math.random() * 200),
        responsesCount: Math.floor(Math.random() * 20),
        bookmarksCount: Math.floor(Math.random() * 50),
        sharesCount: Math.floor(Math.random() * 30),
      },
    });

    // Create article tags
    for (const tagSlug of data.tags) {
      const tag = tags.find(t => t.slug === tagSlug);
      if (tag) {
        await prisma.articleTag.upsert({
          where: {
            articleId_tagId: {
              articleId: article.id,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            articleId: article.id,
            tagId: tag.id,
          },
        });
      }
    }

    articles.push(article);
  }

  // Create some follows between users
  console.log('👥 Creating follows...');
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (i !== j && Math.random() > 0.5) {
        await prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: users[i].id,
              followingId: users[j].id,
            },
          },
          update: {},
          create: {
            followerId: users[i].id,
            followingId: users[j].id,
          },
        });
      }
    }
  }

  // Create some claps
  console.log('👏 Creating claps...');
  for (const article of articles.slice(0, 5)) {
    for (const user of users.slice(0, 3)) {
      if (Math.random() > 0.3) {
        await prisma.clap.upsert({
          where: {
            articleId_userId: {
              articleId: article.id,
              userId: user.id,
            },
          },
          update: {},
          create: {
            articleId: article.id,
            userId: user.id,
            clapCount: Math.floor(Math.random() * 10) + 1,
          },
        });
      }
    }
  }

  // Create some responses (comments)
  console.log('💬 Creating responses...');
  const responseTexts = [
    'Great article! This really helped me understand the topic better.',
    'Thanks for sharing these insights. Very useful for students.',
    'I wish I had read this before starting my semester!',
    'Could you elaborate more on the second point?',
    'Excellent tips! I will definitely try these out.',
  ];

  for (const article of articles.slice(0, 6)) {
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      await prisma.response.create({
        data: {
          articleId: article.id,
          authorId: user.id,
          content: {
            type: 'paragraph',
            text: responseTexts[Math.floor(Math.random() * responseTexts.length)],
          },
          clapsCount: Math.floor(Math.random() * 20),
        },
      });
    }
  }

  // Create some bookmarks
  console.log('🔖 Creating bookmarks...');
  for (const user of users.slice(0, 3)) {
    for (const article of articles.slice(0, 4)) {
      if (Math.random() > 0.5) {
        await prisma.bookmark.upsert({
          where: {
            userId_articleId: {
              articleId: article.id,
              userId: user.id,
            },
          },
          update: {},
          create: {
            articleId: article.id,
            userId: user.id,
          },
        });
      }
    }
  }

  console.log(`✅ Created ${articles.length} articles with content, stats, tags, and engagement data`);
}

// Run if called directly
if (require.main === module) {
  seedBlogContent()
    .then(() => {
      console.log('Blog seeding completed');
      process.exit(0);
    })
    .catch((e) => {
      console.error('Error seeding blog:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
