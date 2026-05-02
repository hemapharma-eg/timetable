-- ============================================================
-- Dynamic Database Management Functions
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Get all public tables
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS json AS $$
  SELECT COALESCE(json_agg(table_name ORDER BY table_name), '[]'::json)
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(p_table text)
RETURNS json AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordinal_position), '[]'::json)
  FROM (
    SELECT column_name, data_type, is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table
    ORDER BY ordinal_position
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Execute DDL (admin-only: runs with definer privileges)
CREATE OR REPLACE FUNCTION execute_ddl(sql_text text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get row count for a table
CREATE OR REPLACE FUNCTION get_table_row_count(p_table text)
RETURNS bigint AS $$
DECLARE
  cnt bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM public.%I', p_table) INTO cnt;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
