/*
  # Create First Super Admin Function

  ## Overview
  Creates a function and trigger to automatically promote the first registered user to super_admin
  if no super admins exist in the system.

  ## New Functions
  
  ### `check_and_create_first_super_admin()`
  Trigger function that runs after user profile insertion.
  - Checks if any super_admin exists
  - If no super_admin exists, promotes the new user to super_admin
  - Allows system bootstrap without manual database intervention

  ## Important Notes
  1. Only the FIRST user ever registered becomes super_admin automatically
  2. All subsequent users must register with invitation codes
  3. This ensures there's always at least one admin who can manage the system
*/

-- Function to check and create first super admin
CREATE OR REPLACE FUNCTION check_and_create_first_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count existing super admins
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE role = 'super_admin';

  -- If no super admin exists, make this user a super admin
  IF admin_count = 0 THEN
    NEW.role := 'super_admin';
    NEW.project_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on user_profiles
DROP TRIGGER IF EXISTS ensure_first_super_admin ON user_profiles;
CREATE TRIGGER ensure_first_super_admin
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_first_super_admin();