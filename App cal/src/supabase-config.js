import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uhlufmultsilpdqoadmq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobHVmbXVsdHNpbHBkcW9hZG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDk1NjksImV4cCI6MjA5NDE4NTU2OX0.4FwrzFJ-FzmeiYkxTUFQezFbC4zZxk9YotkzQ-UPie8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const auth = supabase.auth;
