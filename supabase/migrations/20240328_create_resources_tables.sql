-- Create resource categories table
CREATE TABLE IF NOT EXISTS "public"."resource_categories" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "category_id" INTEGER REFERENCES resource_categories(id) ON DELETE CASCADE,
    "icon" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE "public"."resource_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;

-- Create policies for resource_categories
CREATE POLICY "Enable read access for all users" ON "public"."resource_categories"
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."resource_categories"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policies for resources
CREATE POLICY "Enable read access for all users" ON "public"."resources"
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."resources"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON "public"."resources"
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users" ON "public"."resources"
    FOR DELETE
    TO authenticated
    USING (true); 