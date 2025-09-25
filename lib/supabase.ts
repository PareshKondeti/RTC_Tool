import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined
const supabaseService = process.env.SUPABASE_SERVICE_ROLE as string | undefined

if (!supabaseUrl) {
  console.warn('Supabase URL is not set. Set NEXT_PUBLIC_SUPABASE_URL in your env.')
}

// Server client with service role for writes from server actions
export const supabaseServer = supabaseService && supabaseUrl
  ? createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false }
    })
  : null

// Optional: public client (not used yet, kept for future client-side reads)
export const supabasePublic = supabaseAnon && supabaseUrl
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false }
    })
  : null


