
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://abhbahpcwjvmgzbkwrah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaGJhaHBjd2p2bWd6Ymt3cmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTQ2OTEsImV4cCI6MjA3NjEzMDY5MX0.lkc9ZYT4qrNvOP9jkD3SuGcorEkREGEGS24XfMv8eVs';

// NOTE: In a real Next.js app, these would come from process.env.NEXT_PUBLIC_...
// As per instructions, using them directly but assuming they are configured externally.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
