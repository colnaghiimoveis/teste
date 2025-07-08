'use client';
import { useAuth } from '@/context/AuthContext';
import ChatPageInner from '@/components/ChatPageInner';

export default function ProtectedChatPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return <ChatPageInner />;
}
