'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData) {
  const supabase = await createClient()

  const nome = formData.get('nome')
  const email = formData.get('email')
  const password = formData.get('password')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (!data.session) {
    redirect('/signup?info=' + encodeURIComponent('Controlla la tua email per confermare la registrazione.'))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
