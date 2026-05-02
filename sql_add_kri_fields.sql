-- Add KRI fields to risk_management_plan table
ALTER TABLE public.risk_management_plan
  ADD COLUMN IF NOT EXISTS "KRI_Title" text,
  ADD COLUMN IF NOT EXISTS "KRI_Calculation" text;
