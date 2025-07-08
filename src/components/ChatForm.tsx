'use client'
import { useState } from "react";

type ChatFormProps = {
  setResposta: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

export default function ChatForm({ setResposta, setLoading, loading }: ChatFormProps) {
  const [pergunta, setPergunta] = useState("");
  const [bairro, setBairro] = useState("");
  const [construtora, setConstrutora] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResposta("");
    setLoading(true);
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, bairro, construtora, valorMin, valorMax, status })
      });
      const data = await res.json();
      setResposta(data.resposta);
    } catch (e) {
      setResposta("Erro ao buscar resposta. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <input
        className="border rounded p-2 w-full text-gray-900 bg-white placeholder-gray-500 border-gray-300"
        placeholder="Digite sua pergunta..."
        value={pergunta}
        onChange={e => setPergunta(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <input className="border rounded p-2 flex-1 text-gray-900 bg-white placeholder-gray-500 border-gray-300"
          placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
        <input className="border rounded p-2 flex-1 text-gray-900 bg-white placeholder-gray-500 border-gray-300"
          placeholder="Construtora" value={construtora} onChange={e => setConstrutora(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <input className="border rounded p-2 flex-1 text-gray-900 bg-white placeholder-gray-500 border-gray-300"
          placeholder="Valor Mínimo" value={valorMin} onChange={e => setValorMin(e.target.value)} />
        <input className="border rounded p-2 flex-1 text-gray-900 bg-white placeholder-gray-500 border-gray-300"
          placeholder="Valor Máximo" value={valorMax} onChange={e => setValorMax(e.target.value)} />
      </div>
      <input className="border rounded p-2 w-full text-gray-900 bg-white placeholder-gray-500 border-gray-300"
        placeholder="Status (pronto, em construção...)" value={status} onChange={e => setStatus(e.target.value)} />
      <button
        className="bg-blue-700 text-white rounded px-4 py-2 w-full"
        type="submit"
        disabled={loading}
      >
        {loading ? "Consultando..." : "Perguntar"}
      </button>
    </form>
  );
}
