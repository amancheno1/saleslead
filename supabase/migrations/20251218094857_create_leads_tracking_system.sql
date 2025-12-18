/*
  # Lead Tracking System Database Schema

  ## Overview
  Creates a complete lead tracking system with leads management and goal settings.

  ## New Tables
  
  ### `leads`
  Stores all lead information including contact details, sales funnel stages, and financial data.
  - `id` (uuid, primary key) - Unique identifier
  - `first_name` (text) - Lead's first name
  - `last_name` (text) - Lead's last name
  - `form_type` (text) - Source form (guía, calculadora, dashboard, nuevo programa)
  - `entry_date` (date) - Date lead entered the system
  - `contact_date` (date, nullable) - Date of first contact
  - `scheduled_call_date` (date, nullable) - Scheduled call appointment date
  - `attended_meeting` (boolean, nullable) - Whether lead attended the scheduled meeting
  - `result` (text, nullable) - Meeting result (interesado, no, seguimiento)
  - `sale_made` (boolean) - Whether a sale was completed
  - `observations` (text, nullable) - Additional notes
  - `sale_amount` (numeric, nullable) - Total sale amount
  - `payment_method` (text, nullable) - Payment method used
  - `cash_collected` (numeric, nullable) - Actual cash received
  - `closer` (text, nullable) - Name of closer who handled the sale
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `settings`
  Stores system configuration including weekly goals.
  - `id` (uuid, primary key) - Unique identifier
  - `weekly_goal` (integer) - Target number of leads per week
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on both tables
  - Public read access for authenticated users
  - Public write access for authenticated users (suitable for single-user/team use)

  ## Notes
  1. Commissions are calculated in the application layer:
     - Setter commission: 7% of sale_amount and 7% of cash_collected
     - Closer commission: 8% of cash_collected
  2. All financial amounts use numeric type for precision
  3. Dates are stored separately for flexible reporting by week/month
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  form_type text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  contact_date date,
  scheduled_call_date date,
  attended_meeting boolean,
  result text,
  sale_made boolean DEFAULT false,
  observations text,
  sale_amount numeric(10, 2),
  payment_method text,
  cash_collected numeric(10, 2),
  closer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_goal integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (weekly_goal) 
VALUES (50)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for leads table
CREATE POLICY "Anyone can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for settings table
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_entry_date ON leads(entry_date);
CREATE INDEX IF NOT EXISTS idx_leads_scheduled_call_date ON leads(scheduled_call_date);
CREATE INDEX IF NOT EXISTS idx_leads_sale_made ON leads(sale_made);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
  BEFORE UPDATE ON settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();