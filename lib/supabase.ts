import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfscwyhficdubiirvzer.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc2N3eWhmaWNkdWJpaXJ2emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzI4MzgsImV4cCI6MjA5MTk0ODgzOH0.iS6bSX-glL6f1NuP6TgpV3X1B80s3VuAVu1XxRplIno'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
