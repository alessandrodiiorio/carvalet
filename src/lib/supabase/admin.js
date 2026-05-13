// Server-only Supabase client with SERVICE_ROLE_KEY.
// MAI esportare/usare lato client. Solo dentro server actions/route handlers.

import { createClient } from '@supabase/supabase-js'

let _client = null

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY non configurata. Aggiungila a env vars Vercel + .env.local.',
    )
  }

  if (!_client) {
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}
