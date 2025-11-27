-- Production Database Sync Script
-- This script handles adding new tables/features to an existing production database
-- without disturbing existing data or breaking migrations

-- ========================================
-- BLOG CONTENT SYSTEM TABLES
-- ========================================

-- Tags table
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_slug_key') THEN
        ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_name_key') THEN
        ALTER TABLE "tags" ADD CONSTRAINT "tags_name_key" UNIQUE ("name");
    END IF;
END $$;

-- BlogPostTag junction table
CREATE TABLE IF NOT EXISTS "blog_post_tags" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_post_tags_blog_post_id_tag_id_key') THEN
        ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_post_id_tag_id_key" UNIQUE ("blog_post_id", "tag_id");
    END IF;
END $$;

-- Comments table
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Claps table
CREATE TABLE IF NOT EXISTS "claps" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "claps_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claps_blog_post_id_author_id_key') THEN
        ALTER TABLE "claps" ADD CONSTRAINT "claps_blog_post_id_author_id_key" UNIQUE ("blog_post_id", "author_id");
    END IF;
END $$;

-- Bookmarks table
CREATE TABLE IF NOT EXISTS "bookmarks" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_blog_post_id_author_id_key') THEN
        ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_blog_post_id_author_id_key" UNIQUE ("blog_post_id", "author_id");
    END IF;
END $$;

-- Follow table
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_id_following_id_key') THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");
    END IF;
END $$;

-- ========================================
-- VERIFICATION SYSTEM TABLES
-- ========================================

-- VerificationRequest table
CREATE TABLE IF NOT EXISTS "verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_documents" JSONB,
    "admin_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- UniversityDomain table
CREATE TABLE IF NOT EXISTS "university_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "university_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "university_domains_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'university_domains_domain_key') THEN
        ALTER TABLE "university_domains" ADD CONSTRAINT "university_domains_domain_key" UNIQUE ("domain");
    END IF;
END $$;

-- VerificationAuditLog table
CREATE TABLE IF NOT EXISTS "verification_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- RESUME SYSTEM TABLES
-- ========================================

-- Resume table
CREATE TABLE IF NOT EXISTS "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "experience" JSONB,
    "education" JSONB,
    "skills" JSONB,
    "languages" JSONB,
    "certifications" JSONB,
    "projects" JSONB,
    "file_url" TEXT,
    "template" TEXT NOT NULL DEFAULT 'modern',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- Add foreign key constraints only if both tables exist and constraints don't exist
DO $$
BEGIN
    -- BlogPostTag foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_post_tags')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_post_tags' AND constraint_name = 'blog_post_tags_blog_post_id_fkey') THEN
        ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_post_tags')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_post_tags' AND constraint_name = 'blog_post_tags_tag_id_fkey') THEN
        ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Comments foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comments' AND constraint_name = 'comments_blog_post_id_fkey') THEN
        ALTER TABLE "comments" ADD CONSTRAINT "comments_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comments' AND constraint_name = 'comments_author_id_fkey') THEN
        ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comments' AND constraint_name = 'comments_parent_id_fkey') THEN
        ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Claps foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claps')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'claps' AND constraint_name = 'claps_blog_post_id_fkey') THEN
        ALTER TABLE "claps" ADD CONSTRAINT "claps_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claps')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'claps' AND constraint_name = 'claps_author_id_fkey') THEN
        ALTER TABLE "claps" ADD CONSTRAINT "claps_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Bookmarks foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookmarks')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'bookmarks' AND constraint_name = 'bookmarks_blog_post_id_fkey') THEN
        ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookmarks')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'bookmarks' AND constraint_name = 'bookmarks_author_id_fkey') THEN
        ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Follow foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'follows' AND constraint_name = 'follows_follower_id_fkey') THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'follows' AND constraint_name = 'follows_following_id_fkey') THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- VerificationRequest foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_requests')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'verification_requests' AND constraint_name = 'verification_requests_user_id_fkey') THEN
        ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_requests')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'verification_requests' AND constraint_name = 'verification_requests_reviewed_by_fkey') THEN
        ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- UniversityDomain foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'university_domains')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'universities')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'university_domains' AND constraint_name = 'university_domains_university_id_fkey') THEN
        ALTER TABLE "university_domains" ADD CONSTRAINT "university_domains_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- VerificationAuditLog foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_audit_logs')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'verification_audit_logs' AND constraint_name = 'verification_audit_logs_user_id_fkey') THEN
        ALTER TABLE "verification_audit_logs" ADD CONSTRAINT "verification_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_audit_logs')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'verification_audit_logs' AND constraint_name = 'verification_audit_logs_performed_by_fkey') THEN
        ALTER TABLE "verification_audit_logs" ADD CONSTRAINT "verification_audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Resume foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resumes')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'resumes' AND constraint_name = 'resumes_user_id_fkey') THEN
        ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ========================================
-- INDEXES
-- ========================================

-- Create indexes for better performance
DO $$
BEGIN
    -- BlogPostTag indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'blog_post_tags_blog_post_id_idx') THEN
        CREATE INDEX "blog_post_tags_blog_post_id_idx" ON "blog_post_tags"("blog_post_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'blog_post_tags_tag_id_idx') THEN
        CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags"("tag_id");
    END IF;

    -- Comments indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'comments_blog_post_id_idx') THEN
        CREATE INDEX "comments_blog_post_id_idx" ON "comments"("blog_post_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'comments_author_id_idx') THEN
        CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'comments_parent_id_idx') THEN
        CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");
    END IF;

    -- Claps indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'claps_blog_post_id_idx') THEN
        CREATE INDEX "claps_blog_post_id_idx" ON "claps"("blog_post_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'claps_author_id_idx') THEN
        CREATE INDEX "claps_author_id_idx" ON "claps"("author_id");
    END IF;

    -- Bookmarks indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'bookmarks_blog_post_id_idx') THEN
        CREATE INDEX "bookmarks_blog_post_id_idx" ON "bookmarks"("blog_post_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'bookmarks_author_id_idx') THEN
        CREATE INDEX "bookmarks_author_id_idx" ON "bookmarks"("author_id");
    END IF;

    -- Follow indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'follows_follower_id_idx') THEN
        CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'follows_following_id_idx') THEN
        CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");
    END IF;

    -- VerificationRequest indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_requests_user_id_idx') THEN
        CREATE INDEX "verification_requests_user_id_idx" ON "verification_requests"("user_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_requests_status_idx') THEN
        CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_requests_submitted_at_idx') THEN
        CREATE INDEX "verification_requests_submitted_at_idx" ON "verification_requests"("submitted_at");
    END IF;

    -- UniversityDomain indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'university_domains_domain_idx') THEN
        CREATE INDEX "university_domains_domain_idx" ON "university_domains"("domain");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'university_domains_university_id_idx') THEN
        CREATE INDEX "university_domains_university_id_idx" ON "university_domains"("university_id");
    END IF;

    -- VerificationAuditLog indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_audit_logs_user_id_idx') THEN
        CREATE INDEX "verification_audit_logs_user_id_idx" ON "verification_audit_logs"("user_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_audit_logs_action_idx') THEN
        CREATE INDEX "verification_audit_logs_action_idx" ON "verification_audit_logs"("action");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'verification_audit_logs_created_at_idx') THEN
        CREATE INDEX "verification_audit_logs_created_at_idx" ON "verification_audit_logs"("created_at");
    END IF;

    -- Resume indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'resumes_user_id_idx') THEN
        CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'resumes_is_public_idx') THEN
        CREATE INDEX "resumes_is_public_idx" ON "resumes"("is_public");
    END IF;
END $$;