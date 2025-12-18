/*
  # Fix Security and Performance Issues

  ## Changes Made
  
  1. **Add Missing Index**
     - Add index on `meta_leads.user_id` to improve foreign key query performance
  
  2. **Optimize RLS Policies**
     - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
     - This prevents re-evaluation of auth function for each row, improving performance
     - Applies to tables: projects, leads, meta_leads
  
  3. **Remove Unused Indexes**
     - Drop indexes that are not being used to reduce maintenance overhead
     - Removed: idx_leads_entry_date, idx_leads_scheduled_call_date, idx_leads_sale_made, idx_leads_user_id
     - Removed: idx_meta_leads_project_id, idx_meta_leads_week_start_date
  
  4. **Fix Function Search Path**
     - Update `update_updated_at_column` function to have immutable search path
  
  ## Notes
  - Auth DB connection strategy and leaked password protection require configuration changes
    outside of database migrations (done via Supabase dashboard settings)
*/

-- 1. Add missing index for meta_leads.user_id
CREATE INDEX IF NOT EXISTS idx_meta_leads_user_id ON meta_leads(user_id);

-- 2. Drop and recreate RLS policies for projects table with optimized auth.uid()
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 3. Drop and recreate RLS policies for leads table with optimized auth.uid()
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 4. Drop and recreate RLS policies for meta_leads table with optimized auth.uid()
DROP POLICY IF EXISTS "Users can view meta leads from their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can insert meta leads to their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can update meta leads from their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can delete meta leads from their projects" ON meta_leads;

CREATE POLICY "Users can view meta leads from their projects"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert meta leads to their projects"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update meta leads from their projects"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete meta leads from their projects"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 5. Remove unused indexes
DROP INDEX IF EXISTS idx_leads_entry_date;
DROP INDEX IF EXISTS idx_leads_scheduled_call_date;
DROP INDEX IF EXISTS idx_leads_sale_made;
DROP INDEX IF EXISTS idx_leads_user_id;
DROP INDEX IF EXISTS idx_meta_leads_project_id;
DROP INDEX IF EXISTS idx_meta_leads_week_start_date;

-- 6. Fix function search path by recreating with SECURITY DEFINER and explicit schema
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;