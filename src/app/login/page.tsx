'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white shadow-xl p-10 rounded-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo-colnaghi.png" alt="Colnaghi" width={120} className="mb-2" />
          <h1 className="text-4xl font-bold text-[#800026] text-center mb-3">
            Acessar o Ai.plim
          </h1>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#800026",
                  brandAccent: "#800026",
                  inputLabelText: "#800026",
                },
              },
            },
          }}
          providers={[]} // sem login social
          localization={{
            variables: {
              sign_in: {
                email_label: "E-mail",
                password_label: "Senha",
                button_label: "Entrar",
                link_text: "",
              },
              sign_up: {
                email_label: "E-mail",
                password_label: "Senha",
                button_label: "Cadastrar",
                link_text: "",
              },
              forgotten_password: {
                email_label: "E-mail",
                button_label: "Recuperar senha",
                link_text: "",
              },
              magic_link: {
                email_input_label: "Seu e-mail",
                button_label: "Enviar link mágico",
                link_text: "",
              },
            },
          }}
          onlyThirdPartyProviders={false}
          showLinks={false}
          view="sign_in"
        />
      </div>
    </div>
  )
}
