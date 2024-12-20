-- Create resource_template_categories table (separate from user resource categories)
CREATE TABLE IF NOT EXISTS resource_template_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0
);

-- Add created_by to resources table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'resources' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE resources 
        ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create resource_templates table
CREATE TABLE IF NOT EXISTS resource_templates (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES resource_template_categories(id),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create a table to track which templates have been used by which tenants
CREATE TABLE IF NOT EXISTS tenant_resource_templates (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_id INTEGER NOT NULL REFERENCES resource_templates(id),
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, template_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_resource_templates_category ON resource_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_tenant_resource_templates_tenant ON tenant_resource_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_resource_templates_template ON tenant_resource_templates(template_id);

-- Add some initial categories
INSERT INTO resource_template_categories (name, description, sort_order) VALUES
('Design Tools', 'Design and prototyping tools for product teams', 10),
('Development', 'Development tools and resources', 20),
('Marketing', 'Marketing and analytics tools', 30),
('Productivity', 'Team productivity and collaboration tools', 40),
('Security', 'Security and compliance tools', 50),
('Communication', 'Team communication and messaging tools', 60),
('Documentation', 'Documentation and knowledge base tools', 70),
('Analytics', 'Data analytics and visualization tools', 80)
ON CONFLICT DO NOTHING;

-- Add some sample resources
INSERT INTO resource_templates (title, description, url, category_id, image_url) VALUES
-- Design Tools
('Figma', 'Professional design tool for teams', 'https://www.figma.com', 
 (SELECT id FROM resource_template_categories WHERE name = 'Design Tools'),
 'https://cdn.cdnlogo.com/logos/f/43/figma.svg'),

('Canva', 'Easy-to-use design platform', 'https://www.canva.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Design Tools'),
 'https://cdn.cdnlogo.com/logos/c/30/canva.svg'),

-- Development
('GitHub', 'Code hosting and collaboration platform', 'https://github.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Development'),
 'https://cdn.cdnlogo.com/logos/g/69/github.svg'),

('GitLab', 'DevOps platform', 'https://gitlab.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Development'),
 'https://cdn.cdnlogo.com/logos/g/59/gitlab.svg'),

-- Marketing
('Google Analytics', 'Web analytics service', 'https://analytics.google.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Marketing'),
 'https://cdn.cdnlogo.com/logos/g/76/google-analytics.svg'),

('Mailchimp', 'Email marketing platform', 'https://mailchimp.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Marketing'),
 'https://cdn.cdnlogo.com/logos/m/34/mailchimp.svg'),

-- Productivity
('Notion', 'All-in-one workspace', 'https://www.notion.so',
 (SELECT id FROM resource_template_categories WHERE name = 'Productivity'),
 'https://cdn.cdnlogo.com/logos/n/64/notion.svg'),

('Trello', 'Project management tool', 'https://trello.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Productivity'),
 'https://cdn.cdnlogo.com/logos/t/78/trello.svg'),

-- Security
('1Password', 'Password manager for teams', 'https://1password.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Security'),
 'https://cdn.cdnlogo.com/logos/1/48/1password.svg'),

('Okta', 'Identity management platform', 'https://www.okta.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Security'),
 'https://cdn.cdnlogo.com/logos/o/84/okta.svg'),

-- Communication
('Slack', 'Business communication platform', 'https://slack.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Communication'),
 'https://cdn.cdnlogo.com/logos/s/52/slack.svg'),

('Zoom', 'Video conferencing tool', 'https://zoom.us',
 (SELECT id FROM resource_template_categories WHERE name = 'Communication'),
 'https://cdn.cdnlogo.com/logos/z/68/zoom.svg'),

-- Documentation
('Confluence', 'Team collaboration and documentation', 'https://www.atlassian.com/software/confluence',
 (SELECT id FROM resource_template_categories WHERE name = 'Documentation'),
 'https://cdn.cdnlogo.com/logos/c/31/confluence.svg'),

('GitBook', 'Documentation and knowledge base platform', 'https://www.gitbook.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Documentation'),
 'https://cdn.cdnlogo.com/logos/g/68/gitbook.svg'),

-- Analytics
('Mixpanel', 'Product analytics platform', 'https://mixpanel.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Analytics'),
 'https://cdn.cdnlogo.com/logos/m/33/mixpanel.svg'),

('Amplitude', 'Product analytics platform', 'https://amplitude.com',
 (SELECT id FROM resource_template_categories WHERE name = 'Analytics'),
 'https://cdn.cdnlogo.com/logos/a/94/amplitude.svg')
ON CONFLICT DO NOTHING; 

-- Add stored procedure for deleting resources with references
CREATE OR REPLACE FUNCTION delete_resource_with_references(resource_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete from tenant_resource_templates first
    DELETE FROM tenant_resource_templates
    WHERE resource_id = $1;

    -- Then delete the resource itself
    DELETE FROM resources
    WHERE id = $1;
END;
$$; 