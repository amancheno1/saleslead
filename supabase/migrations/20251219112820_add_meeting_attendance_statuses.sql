/*
  # Update Meeting Attendance Field
  
  1. Changes
    - Convert `attended_meeting` from boolean to text type
    - Add check constraint to allow only: 'si', 'cancelada', 'no_show', 'no', or NULL
    - Migrate existing data:
      - true → 'si'
      - false → 'no'
      - NULL → NULL
  
  2. Security
    - No changes to RLS policies required
    - Existing policies continue to work with new field type
*/

-- First, convert existing boolean values to text values in a safe way
-- Add a temporary column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS attended_meeting_new text;

-- Migrate existing data
UPDATE leads 
SET attended_meeting_new = CASE 
  WHEN attended_meeting = true THEN 'si'
  WHEN attended_meeting = false THEN 'no'
  ELSE NULL
END;

-- Drop the old column
ALTER TABLE leads DROP COLUMN IF EXISTS attended_meeting;

-- Rename the new column to the original name
ALTER TABLE leads RENAME COLUMN attended_meeting_new TO attended_meeting;

-- Add check constraint for allowed values
ALTER TABLE leads ADD CONSTRAINT attended_meeting_values 
  CHECK (attended_meeting IN ('si', 'cancelada', 'no_show', 'no') OR attended_meeting IS NULL);
