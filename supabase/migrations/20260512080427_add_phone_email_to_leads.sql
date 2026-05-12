/*
  # Add phone and email columns to leads

  1. Modified Tables
    - `leads`
      - `phone` (text, nullable) - phone number for WhatsApp contact
      - `email` (text, nullable) - email address for email contact

  2. Important Notes
    - These fields enable direct contact actions from the calendar view
    - Both are optional to maintain backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'phone'
  ) THEN
    ALTER TABLE leads ADD COLUMN phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'email'
  ) THEN
    ALTER TABLE leads ADD COLUMN email text;
  END IF;
END $$;
