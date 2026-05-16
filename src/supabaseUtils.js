/**
 * Supabase Fetch Utilities
 * Helper to bypass the default 1000-row limit by fetching in chunks.
 */

import { supabase } from './supabase';

/**
 * Fetches ALL records from a table by paginating through them.
 * This bypasses the default 1000-row limit in Supabase.
 */
export async function fetchAll(tableName, options = {}) {
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const to = from + step - 1;
    let query = supabase.from(tableName).select('*').range(from, to);

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[fetchAll] Error fetching ${tableName}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }

    // Safety break
    if (from > 20000) break; 
  }

  return allData;
}
