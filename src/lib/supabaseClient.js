import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ivzlryhjfchxsyxcxzzj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2enpyeWhqZmNoeHN5eGN4enpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ2NjU4MjUsImV4cCI6MjA0MDI0MTgyNX0.y-P10p-T5o-Py36k5Myy2e0s0s5r5a4s3Z6p8e7y4bA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);