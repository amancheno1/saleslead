/*
  # Add Setter Field to Leads Table

  ## Changes
  1. New Columns
    - `setter` (text, nullable) - Name of the setter who generated the lead
      - Similar to the existing `closer` field
      - Used to calculate setter commissions

  ## Notes
  - This field is optional and nullable
  - Setter commissions are already calculated in the application (7% of cash collected)
  - This change allows assigning specific setter names to leads for commission tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'setter'
  ) THEN
    ALTER TABLE leads ADD COLUMN setter text;
  END IF;
END $$;
