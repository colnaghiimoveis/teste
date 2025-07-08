import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from "react";
import { Typewriter } from 'react-simple-typewriter';

type Mensagem = {
  role: 'user' | 'bot';
  content: string;
};

interface BotAnswerProps {
  mensagens: Mensagem[];
  loading: boolean;
}

export default function BotAnswer({ mensagens, loading }: BotAnswerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, loading]);

  return (
    <div>
      {mensagens.length === 0 && !loading && (
        <div className="text-gray-400 text-center py-8">
          Digite sua primeira mensagem para começar.
        </div>
      )}
      <AnimatePresence initial={false}>
        {mensagens.map((msg, idx) => (
          <motion.div
            key={idx + '-' + msg.role + '-' + (msg.content?.slice(0, 10) ?? idx)}
            className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 250, damping: 20, duration: 0.3 }}
          >
            <div
              className={`rounded-xl px-4 py-2 max-w-2xl break-words text-base shadow
                ${msg.role === 'user'
                  ? 'bg-[#800026] text-white'
                  : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`
              }
            >
              {/* Última mensagem do bot usa typewriter se está carregando */}
              {msg.role === 'bot' && loading && idx === mensagens.length - 1 ? (
                <span className="block min-h-[32px]">
                  <Typewriter
                    words={[msg.content]}
                    loop={1}
                    cursor
                    cursorStyle="_"
                    typeSpeed={18}
                    deleteSpeed={99}
                    delaySpeed={50000}
                  />
                </span>
              ) : msg.role === 'bot' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}
        {loading &&
          (
            mensagens.length === 0 ||
            mensagens[mensagens.length - 1]?.role !== "bot"
          ) ? (
            <motion.div
              className="mb-2 flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-xl px-4 py-2 max-w-xs bg-gray-100 text-gray-900 animate-pulse">
                ...
              </div>
            </motion.div>
          ) : null}
        <div ref={bottomRef} />
      </AnimatePresence>
    </div>
  );
}
