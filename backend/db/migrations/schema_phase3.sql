-- PostgreSQL & Supabase Compatible DDL Schema - Phase 3 Extension
-- Research Profiles, Automated Discovery, AI Relevance Assessments & Smart Alerts

CREATE TABLE IF NOT EXISTS research_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    topics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    domains_json JSONB DEFAULT '[]'::jsonb,
    pub_types_json JSONB DEFAULT '[]'::jsonb,
    sources_json JSONB NOT NULL DEFAULT '["arxiv", "openalex", "crossref", "semantic_scholar"]'::jsonb,
    date_range_days INTEGER DEFAULT 30,
    language VARCHAR(10) DEFAULT 'en',
    min_relevance VARCHAR(20) DEFAULT 'Medium',
    frequency VARCHAR(50) DEFAULT 'daily',
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discovered_publications (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    normalized_title VARCHAR(500) NOT NULL,
    authors VARCHAR(500),
    journal_or_venue VARCHAR(255),
    publication_year INTEGER,
    publication_date VARCHAR(50),
    doi VARCHAR(255),
    url VARCHAR(500),
    pdf_url VARCHAR(500),
    abstract TEXT,
    source_db VARCHAR(50) NOT NULL,
    citation_count INTEGER DEFAULT 0,
    first_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discovered_pub_norm_title ON discovered_publications(normalized_title);
CREATE INDEX IF NOT EXISTS idx_discovered_pub_doi ON discovered_publications(doi);

CREATE TABLE IF NOT EXISTS user_publications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    publication_id INTEGER REFERENCES discovered_publications(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES research_profiles(id) ON DELETE SET NULL,
    relevance_score FLOAT DEFAULT 0.0,
    relevance_category VARCHAR(20) DEFAULT 'Medium',
    ai_explanation TEXT,
    matching_keywords_json JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    is_saved BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    user_notes TEXT,
    user_tags_json JSONB DEFAULT '[]'::jsonb,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_publication UNIQUE(user_id, publication_id, profile_id)
);

CREATE TABLE IF NOT EXISTS notification_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES research_profiles(id) ON DELETE SET NULL,
    publication_id INTEGER REFERENCES discovered_publications(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    relevance_category VARCHAR(20) DEFAULT 'Medium',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitoring_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES research_profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    papers_found INTEGER DEFAULT 0,
    papers_new INTEGER DEFAULT 0,
    error_message TEXT,
    triggered_by VARCHAR(50) DEFAULT 'manual'
);
