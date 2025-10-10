import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxnrfvtngpdntlebxotk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bnJmdnRuZ3BkbnRsZWJ4b3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzM5NjQsImV4cCI6MjA2NzkwOTk2NH0.dJD5LHSW5jjM0AtrRhXQvl_TxwbqWa56-v64Efdd6Sk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);