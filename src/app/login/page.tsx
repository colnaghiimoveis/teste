'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = '/';
    }
  }, [user, loading]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
        <h1 className="text-3xl font-bold text-[#800026] mb-4 text-center">Acessar o Ai.plim</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: {
              sign_in: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Entrar' },
              sign_up: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Criar conta' }
            }
          }}
        />
      </div>
    </div>
  );
}
