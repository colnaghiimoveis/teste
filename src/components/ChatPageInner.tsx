'use client';
import { useState, useEffect, useRef } from "react";
import BotAnswer from "@/components/BotAnswer";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type Mensagem = { role: 'user' | 'bot', content: string };
type Conversa = {
  id: string;
  nome: string;
  data: string;
  mensagens: Mensagem[];
};

export default function ChatPageInner() {
  const [input, setInput] = useState("");
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<string>("");
  const [nomeNovaConversa, setNomeNovaConversa] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Cabeçalho: menu animado do usuário
  const { user } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Título da conversa - edição inline
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const inputTituloRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false);
      }
    }
    if (menuAberto) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuAberto]);

  // Foco automático no input de título ao editar
  useEffect(() => {
    if (editandoTitulo && inputTituloRef.current) {
      inputTituloRef.current.focus();
    }
  }, [editandoTitulo]);

  // Obter nome (ou fallback)
  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || "Usuário";

  // Chat localstorage/historico
  useEffect(() => {
    const salvas = localStorage.getItem("chat_conversas_colnaghi");
    let arr: Conversa[] = salvas ? JSON.parse(salvas) : [];
    if (!arr.length) {
      const id = uuidv4();
      arr = [{
        id,
        nome: "Nova Conversa",
        data: new Date().toISOString(),
        mensagens: [],
      }];
    }
    setConversas(arr);
    setConversaAtiva(arr[0].id);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_conversas_colnaghi", JSON.stringify(conversas));
  }, [conversas]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversaAtiva, conversas]);

  function criarConversa() {
    if (!nomeNovaConversa.trim()) return;
    const id = uuidv4();
    const nova: Conversa = {
      id,
      nome: nomeNovaConversa,
      data: new Date().toISOString(),
      mensagens: [],
    };
    setConversas(cs => [nova, ...cs]);
    setConversaAtiva(id);
    setNomeNovaConversa("");
  }

  function selecionarConversa(id: string) {
    setConversaAtiva(id);
  }

  function renomearConversa(id: string, nome: string) {
    setConversas(cs => cs.map(c => c.id === id ? { ...c, nome } : c));
  }

  function deletarConversa(id: string) {
    const restante = conversas.filter(c => c.id !== id);
    setConversas(restante);
    if (restante.length) setConversaAtiva(restante[0].id);
    else {
      const idNew = uuidv4();
      const nova: Conversa = {
        id: idNew,
        nome: "Nova Conversa",
        data: new Date().toISOString(),
        mensagens: [],
      };
      setConversas([nova]);
      setConversaAtiva(idNew);
    }
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversaAtiva) return;
    setLoading(true);

    setConversas(cs => cs.map(c =>
      c.id === conversaAtiva
        ? { ...c, mensagens: [...c.mensagens, { role: 'user', content: input }] }
        : c
    ));
    setInput("");

    const historico = conversas.find(c => c.id === conversaAtiva)?.mensagens ?? [];
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, historico }),
      });
      const data = await res.json();
      setConversas(cs => cs.map(c =>
        c.id === conversaAtiva
          ? { ...c, mensagens: [...c.mensagens, { role: 'bot', content: data.resposta }] }
          : c
      ));
    } catch {
      setConversas(cs => cs.map(c =>
        c.id === conversaAtiva
          ? { ...c, mensagens: [...c.mensagens, { role: 'bot', content: "Erro ao buscar resposta." }] }
          : c
      ));
    }
    setLoading(false);
  }

  const conversa = conversas.find(c => c.id === conversaAtiva);

  function salvarNovoTitulo() {
    if (novoTitulo.trim()) {
      renomearConversa(conversaAtiva, novoTitulo.trim());
      setEditandoTitulo(false);
    }
  }
  function cancelarEdicao() {
    setEditandoTitulo(false);
    setNovoTitulo(conversa?.nome || "");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-100 border-r p-4 flex flex-col relative">
        <div className="mb-4">
          <form onSubmit={e => { e.preventDefault(); criarConversa(); }} className="flex gap-2">
            <input
              className="border rounded p-2 flex-1 text-gray-900 bg-white placeholder-gray-500 border-gray-300"
              placeholder="Nova conversa"
              value={nomeNovaConversa}
              onChange={e => setNomeNovaConversa(e.target.value)}
            />
            <motion.button
              className="bg-[#800026] hover:bg-[#A21B34] text-white px-3 py-1 rounded font-bold text-lg"
              type="submit"
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.05 }}
              style={{ transition: 'background 0.2s' }}
            >
              +
            </motion.button>
          </form>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversas.length === 0 && (
            <div className="text-gray-400 text-sm">Nenhuma conversa salva</div>
          )}
          {conversas.map(c => (
            <motion.div
              key={c.id}
              layout
              className={`p-2 rounded cursor-pointer flex items-center justify-between group ${
                c.id === conversaAtiva ? "bg-[#E7C4D1] font-bold shadow-md" : "hover:bg-gray-200"
              }`}
              onClick={() => selecionarConversa(c.id)}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <span
                title={c.nome}
                className="truncate flex-1 text-[#800026] text-base font-bold"
                onDoubleClick={() => {
                  setNovoTitulo(c.nome);
                  setEditandoTitulo(true);
                  setConversaAtiva(c.id);
                }}
                style={{ fontWeight: 600 }}
              >
                {c.nome}
              </span>
              <span className="ml-2 text-xs text-gray-500 font-medium">
                {new Date(c.data).toLocaleString("pt-BR")}
              </span>
              <button
                className="text-gray-400 hover:text-red-600 ml-2 opacity-0 group-hover:opacity-100"
                title="Deletar"
                onClick={e => { e.stopPropagation(); deletarConversa(c.id); }}
              >
                ×
              </button>
            </motion.div>
          ))}
        </div>
        {/* Rodapé/logo Colnaghi */}
        <div className="w-full pt-3 pb-1 mt-2 flex-shrink-0 flex items-end justify-center">
          <img
            src="/logo-colnaghi.png"
            alt="Colnaghi Imóveis"
            width={142}
            style={{ maxWidth: '142px', height: 'auto' }}
            className="opacity-90"
          />
        </div>
      </aside>
      {/* Área principal do chat, com cabeçalho bonito */}
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        {/* Cabeçalho do chat */}
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between pt-5 pb-1 px-2">
          <div className="flex items-center gap-3">
            {/* Avatar redondo com inicial */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#800026] text-white font-bold text-xl shadow">
              {userName.charAt(0).toUpperCase()}
            </div>
            {/* Nome + seta/menu */}
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-1 text-[#800026] font-semibold text-lg focus:outline-none"
                onClick={() => setMenuAberto((prev) => !prev)}
              >
                {userName}
                <svg className={`w-5 h-5 ml-1 transition-transform ${menuAberto ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {menuAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-36 rounded-lg shadow-lg bg-white border z-30"
                  >
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/login';
                      }}
                      className="w-full text-left px-5 py-3 text-[#800026] hover:bg-[#F8D9E1] font-medium transition rounded-lg"
                    >
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Logo do sistema */}
          <span className="text-[#800026] font-bold text-xl tracking-widest hidden md:block">
            AIPLIM
          </span>
        </div>
        {/* Chat principal */}
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-md p-8 flex flex-col h-[92vh] mt-1">
          {/* Título editável da conversa */}
          {conversa && (
            <div className="flex items-center gap-2 mb-4">
              {editandoTitulo && conversa.id === conversaAtiva ? (
                <>
                  <input
                    ref={inputTituloRef}
                    className="border-b border-[#800026] outline-none px-1 text-xl font-semibold text-gray-900 bg-white placeholder-gray-500"
                    value={novoTitulo}
                    onChange={e => setNovoTitulo(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') salvarNovoTitulo();
                      if (e.key === 'Escape') cancelarEdicao();
                    }}
                    maxLength={60}
                    style={{ minWidth: 80, maxWidth: 320 }}
                  />
                  <button
                    className="text-green-700 hover:text-green-900 px-1"
                    title="Salvar título"
                    onClick={salvarNovoTitulo}
                  >✔️</button>
                  <button
                    className="text-red-500 hover:text-red-700 px-1"
                    title="Cancelar"
                    onClick={cancelarEdicao}
                  >✖️</button>
                </>
              ) : (
                <>
                  <span className="text-xl font-semibold text-[#800026]">{conversa.nome}</span>
                  <button
                    className="ml-1 text-[#800026] hover:text-[#A21B34] transition"
                    title="Editar nome da conversa"
                    onClick={() => {
                      setNovoTitulo(conversa?.nome || "");
                      setEditandoTitulo(true);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M4 21v-3.758a1 1 0 0 1 .293-.707l10.085-10.085 4.172 4.172L8.465 20.707A1 1 0 0 1 7.758 21H4zm16.707-13.293a1 1 0 0 0-1.414 0l-2.5 2.5 4.172 4.172 2.5-2.5a1 1 0 0 0 0-1.414l-2.758-2.758z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
          {conversa && (
            <>
              <div className="flex-1 overflow-y-auto mb-4">
                <BotAnswer mensagens={conversa.mensagens} loading={loading} />
                <div ref={bottomRef} />
              </div>
            </>
          )}
          {conversa && (
            <form onSubmit={enviarMensagem} className="flex gap-2">
              <input
                className="border rounded-xl p-3 flex-1 focus:outline-none focus:ring-2 focus:ring-[#800026] text-gray-900 bg-white placeholder-gray-500 border-gray-300"
                type="text"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <motion.button
                type="submit"
                className="bg-[#800026] hover:bg-[#A21B34] text-white rounded-xl px-6 py-2 font-bold"
                disabled={loading || !input.trim()}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.05 }}
              >
                Enviar
              </motion.button>
            </form>
          )}
          {!conversa && (
            <div className="text-gray-400 flex-1 flex items-center justify-center">
              Crie uma nova conversa para começar!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
