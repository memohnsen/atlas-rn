// Quick test file to verify Supabase connection
import { supabase } from './supabase';

export async function testConnection() {
  console.log('Testing Supabase connection...');

  // Test 1: Check if we can connect
  const { data: tables, error: tablesError } = await supabase
    .from('workouts')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.error('Connection error:', tablesError);
    return false;
  }

  console.log('Connection successful!');
  console.log('Sample data:', tables);
  return true;
}
