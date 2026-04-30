import { supabase } from './src/supabase.js';

async function test() {
  console.log("Fetching roles...");
  const { data, error } = await supabase.from('role_permissions').select('*');
  console.log("Permissions:", data, error);
}
test();
