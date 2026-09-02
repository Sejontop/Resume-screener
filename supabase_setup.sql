-- Run this in your Supabase SQL Editor
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  age integer NOT NULL,
  current_location text NOT NULL,
  resume_text text NOT NULL,
  llm_summary text,
  llm_score integer,
  llm_gaps text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
