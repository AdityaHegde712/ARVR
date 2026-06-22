import type { Message, ConversationMode, SessionContext, ToolCall, Product } from '../types';

const STORAGE_KEY = 'arvr-conversation-state';
const MAX_MESSAGES = 30; // Keep last 30 messages to stay within context window

interface PersistedState {
  messages: Message[];
  mode: ConversationMode;
  sessionContext: SessionContext;
}

let messageCounter = 0;

/**
 * Generate a unique message ID.
 */
function generateId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

/**
 * Manages multi-turn conversation context for the AI agent.
 * Tracks: message history, current mode, session context (preferences, recently viewed).
 * Persists to localStorage for session continuity across page reloads.
 */
export class ConversationState {
  private messages: Message[] = [];
  private mode: ConversationMode = 'browsing';
  private sessionContext: SessionContext = {
    preferredStyles: [],
    preferredColors: [],
    recentlyViewedIds: [],
  };

  constructor() {
    this.loadFromStorage();
  }

  // ─── Message Management ─────────────────────────────────────────────────────

  /**
   * Add a message to the conversation history with auto-generated ID and timestamp.
   * Automatically trims to MAX_MESSAGES and persists.
   *
   * @param role - The message role ('user', 'assistant', 'system', or 'tool')
   * @param content - The message content string
   * @param extra - Optional extra fields (tool_calls, tool_call_id, name, products)
   */
  addMessage(
    role: Message['role'],
    content: string,
    extra?: {
      tool_calls?: ToolCall[];
      tool_call_id?: string;
      name?: string;
      products?: Product[];
    },
  ): Message {
    const msg: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      ...(extra?.tool_calls && { tool_calls: extra.tool_calls }),
      ...(extra?.tool_call_id && { tool_call_id: extra.tool_call_id }),
      ...(extra?.name && { name: extra.name }),
      ...(extra?.products && { products: extra.products }),
    };
    this.messages.push(msg);
    this.trimMessages();
    this.persist();
    return msg;
  }

  /**
   * Get all messages for API calls (system prompt is prepended by the caller).
   */
  getHistory(): Message[] {
    return [...this.messages];
  }

  /**
   * Get all messages including current state (for UI display).
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Remove the last message from history (useful for error recovery).
   */
  popLastMessage(): Message | undefined {
    const msg = this.messages.pop();
    if (msg) this.persist();
    return msg;
  }

  /**
   * Replace the last assistant message (for re-generation on error).
   */
  replaceLastMessage(msg: Message): void {
    if (this.messages.length > 0) {
      this.messages[this.messages.length - 1] = msg;
    } else {
      this.messages.push(msg);
    }
    this.persist();
  }

  // ─── Mode Management ────────────────────────────────────────────────────────

  getMode(): ConversationMode {
    return this.mode;
  }

  setMode(mode: ConversationMode): void {
    this.mode = mode;
    this.persist();
  }

  // ─── Session Context ────────────────────────────────────────────────────────

  getContext(): SessionContext {
    return { ...this.sessionContext };
  }

  updateContext(update: Partial<SessionContext>): void {
    this.sessionContext = { ...this.sessionContext, ...update };
    this.persist();
  }

  /**
   * Record that a product was viewed (adds to recently viewed, keeps last 10).
   */
  recordProductView(productId: string): void {
    const viewed = this.sessionContext.recentlyViewedIds.filter(
      (id) => id !== productId,
    );
    viewed.unshift(productId);
    // Keep last 10
    this.sessionContext.recentlyViewedIds = viewed.slice(0, 10);
    this.persist();
  }

  /**
   * Record a preference for a style.
   */
  recordStylePreference(style: string): void {
    const styles = new Set([...this.sessionContext.preferredStyles, style]);
    this.sessionContext.preferredStyles = Array.from(styles);
    this.persist();
  }

  /**
   * Record a preference for a color.
   */
  recordColorPreference(color: string): void {
    const colors = new Set([...this.sessionContext.preferredColors, color]);
    this.sessionContext.preferredColors = Array.from(colors);
    this.persist();
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  /**
   * Clear the conversation and reset to defaults.
   */
  clear(): void {
    this.messages = [];
    this.mode = 'browsing';
    this.sessionContext = {
      preferredStyles: [],
      preferredColors: [],
      recentlyViewedIds: [],
    };
    this.clearStorage();
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  private persist(): void {
    try {
      const state: PersistedState = {
        messages: this.messages,
        mode: this.mode,
        sessionContext: this.sessionContext,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Silently fail if localStorage is unavailable or full
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const state = JSON.parse(raw) as PersistedState;

      if (Array.isArray(state.messages)) {
        this.messages = state.messages;
      }
      if (state.mode) {
        this.mode = state.mode;
      }
      if (state.sessionContext) {
        this.sessionContext = {
          preferredStyles: Array.isArray(state.sessionContext.preferredStyles)
            ? state.sessionContext.preferredStyles
            : [],
          preferredColors: Array.isArray(state.sessionContext.preferredColors)
            ? state.sessionContext.preferredColors
            : [],
          recentlyViewedIds: Array.isArray(state.sessionContext.recentlyViewedIds)
            ? state.sessionContext.recentlyViewedIds
            : [],
          lastCategory: state.sessionContext.lastCategory,
          lastSearchQuery: state.sessionContext.lastSearchQuery,
        };
      }
    } catch {
      // Corrupted storage — start fresh
      this.clear();
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }

  /**
   * Trim messages to keep within context window limit.
   * Always preserves the first message (system prompt) if present.
   * Removes oldest messages first.
   */
  private trimMessages(): void {
    if (this.messages.length <= MAX_MESSAGES) return;

    // Keep the first message if it's a system message
    const systemMsg =
      this.messages.length > 0 && this.messages[0].role === 'system'
        ? this.messages[0]
        : null;

    // Remove oldest non-system messages
    const startIdx = systemMsg ? 1 : 0;
    const toRemove = this.messages.length - MAX_MESSAGES;
    this.messages = [
      ...(systemMsg ? [systemMsg] : []),
      ...this.messages.slice(startIdx + toRemove),
    ];
  }
}
