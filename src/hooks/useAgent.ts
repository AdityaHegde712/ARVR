import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentLoop } from '../ai/AgentLoop';
import { ConversationState } from '../ai/ConversationState';
import type { Message, SelectedProduct, AgentResponse } from '../types';

export interface UseAgentReturn {
  /** Conversation history (user + assistant messages only, for chat UI) */
  messages: Message[];
  /** Send a text message to the AI agent */
  sendMessage: (text: string) => Promise<void>;
  /** Whether the agent is currently processing a message */
  isProcessing: boolean;
  /** The selected product payload for AR handoff (null if none) */
  selectedProduct: SelectedProduct | null;
  /** Clear the conversation and reset state */
  clearConversation: () => void;
  /** Error message if something went wrong, or null */
  error: string | null;
}

/**
 * Filter out internal messages (system, tool) to show only user/assistant messages.
 */
function filterUIMessages(messages: Message[]): Message[] {
  return messages.filter(
    (msg) => msg.role === 'user' || msg.role === 'assistant',
  );
}

/**
 * React hook that wraps the AgentLoop and manages conversation state.
 *
 * Usage:
 * ```tsx
 * const { messages, sendMessage, isProcessing, selectedProduct, clearConversation, error } = useAgent();
 * ```
 */
export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Keep refs to avoid re-creating instances on every render
  const convStateRef = useRef<ConversationState | null>(null);
  const agentLoopRef = useRef<AgentLoop | null>(null);

  // Initialise agent on mount (runs once)
  useEffect(() => {
    const convState = new ConversationState();
    convStateRef.current = convState;
    agentLoopRef.current = new AgentLoop(convState);

    // Load existing messages from persisted state
    setMessages(filterUIMessages(convState.getMessages()));

    // Cleanup on unmount
    return () => {
      convStateRef.current = null;
      agentLoopRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const agent = agentLoopRef.current;
    const state = convStateRef.current;
    if (!agent || !state) return;

    // Validate input
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response: AgentResponse = await agent.processMessage(trimmed);

      // Update messages from conversation state (filtered for UI)
      setMessages(filterUIMessages(state.getMessages()));

      // If a product was selected, set it for AR handoff
      if (response.selectedProduct) {
        setSelectedProduct(response.selectedProduct);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);

      // Refresh messages even on error (user's message is in history)
      setMessages(filterUIMessages(state.getMessages()));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    const state = convStateRef.current;
    if (state) {
      state.clear();
      setMessages([]);
    }
    setSelectedProduct(null);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isProcessing,
    selectedProduct,
    clearConversation,
    error,
  };
}
