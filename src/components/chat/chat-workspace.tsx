"use client";

import { ChatHistoryPanel } from "@/components/chat/chat-history-panel";
import { ChatMessageContent } from "@/components/chat/chat-message-content";
import { GenerationMediaPreview } from "@/components/generation/generation-media-preview";
import {
  isTurnstileClientEnabled,
  TurnstileWidget,
} from "@/components/security/turnstile-widget";
import {
  filterModelsForKey,
  modeLabel,
  modePlaceholder,
  pickDefaultModel,
  supportsNativeWebSearch,
  type CatalogGroup,
  type CatalogModel,
  type ChatMode,
} from "@/lib/chat-models";
import {
  getStoredChatKeyId,
  getStoredChatMode,
  getStoredChatModel,
  setStoredChatKeyId,
  setStoredChatMode,
  setStoredChatModel,
} from "@/lib/chat-page-storage";
import {
  parseGenerationResponse,
  type ParsedGenerationMedia,
} from "@/lib/generation-media";
import {
  requestChatCompletion,
  requestGeneration,
  type ChatBillingInfo,
} from "@/lib/chat-stream-client";
import { resolveAllowedCategoryIds } from "@/lib/api-key-models";
import {
  appendChatMessagesRemote,
  createChatSessionRemote,
  deleteChatSessionRemote,
  fetchChatSession,
  fetchChatSessions,
  type ChatSessionSummary,
} from "@/lib/chat-history-client";
import { cn } from "@/lib/utils";
import {
  Globe,
  ImageIcon,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Square,
  VideoIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ApiKeyItem = {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  allowed_category_ids: string[] | null;
  default_model_id: string | null;
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  media?: ParsedGenerationMedia;
  error?: boolean;
  streaming?: boolean;
};

const MODE_OPTIONS: { id: ChatMode; label: string; icon: typeof MessageSquare }[] =
  [
    { id: "chat", label: "对话", icon: MessageSquare },
    { id: "image", label: "图像", icon: ImageIcon },
    { id: "video", label: "视频", icon: VideoIcon },
  ];

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBillingNote(billing?: ChatBillingInfo, accountBalance?: number) {
  if (billing) {
    return `本次扣费 ¥${billing.cost}，账户余额 ¥${billing.balance}`;
  }
  if (typeof accountBalance === "number") {
    return `账户余额 ¥${accountBalance.toFixed(2)}（流式对话结束后可在控制台查看明细）`;
  }
  return "";
}

export function ChatWorkspace() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [loadingBoot, setLoadingBoot] = useState(true);

  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [billingNote, setBillingNote] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [historyNotice, setHistoryNotice] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const turnstileRequired = isTurnstileClientEnabled();

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const assistantContentRef = useRef("");

  const activeKeys = useMemo(
    () => keys.filter((k) => k.is_active),
    [keys]
  );

  const selectedKey = useMemo(
    () => activeKeys.find((k) => k.id === selectedKeyId) ?? null,
    [activeKeys, selectedKeyId]
  );

  const availableModels = useMemo(() => {
    if (!selectedKey) return [] as CatalogModel[];
    return filterModelsForKey(
      groups,
      resolveAllowedCategoryIds(selectedKey.allowed_category_ids),
      mode
    );
  }, [groups, selectedKey, mode]);

  const selectedModelMeta = useMemo(
    () => availableModels.find((m) => m.id === model) ?? null,
    [availableModels, model]
  );

  const webSearchSupported = supportsNativeWebSearch(
    selectedModelMeta?.provider
  );

  const refreshKeys = useCallback(async () => {
    const res = await fetch("/api/keys");
    const data = await res.json();
    if (data.keys) {
      setKeys(data.keys);
      if (typeof data.accountBalance === "number") {
        setAccountBalance(data.accountBalance);
      }
    }
    return data;
  }, []);

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    const result = await fetchChatSessions();
    if (result.error) {
      setHistoryNotice(result.error);
      setSessions([]);
    } else {
      setSessions(result.sessions);
      if (result.sessions.length > 0) {
        setHistoryNotice("");
      }
    }
    setSessionsLoading(false);
  }, []);

  const setActiveSessionId = useCallback((id: string | null) => {
    sessionIdRef.current = id;
    setSessionId(id);
  }, []);

  const ensureSession = useCallback(
    async (firstUserText?: string): Promise<string | null> => {
      if (sessionIdRef.current) return sessionIdRef.current;
      if (!selectedKeyId || !model) return null;

      const result = await createChatSessionRemote({
        mode,
        modelId: model,
        apiKeyId: selectedKeyId,
        title: firstUserText?.trim() ? undefined : "新对话",
      });

      if ("error" in result) {
        setHistoryNotice(result.error);
        return null;
      }

      setActiveSessionId(result.sessionId);
      void refreshSessions();
      return result.sessionId;
    },
    [mode, model, selectedKeyId, refreshSessions, setActiveSessionId]
  );

  const persistExchange = useCallback(
    async (
      userContent: string,
      assistant: {
        content: string;
        media?: ParsedGenerationMedia;
        error?: boolean;
      },
      options?: { isFirstTurn?: boolean }
    ) => {
      const sid = await ensureSession(
        options?.isFirstTurn ? userContent : undefined
      );
      if (!sid) return;

      const result = await appendChatMessagesRemote(
        sid,
        [
          { role: "user", content: userContent },
          {
            role: "assistant",
            content: assistant.content,
            media: assistant.media ?? null,
            isError: assistant.error ?? false,
          },
        ],
        options?.isFirstTurn ? userContent : undefined
      );

      if ("error" in result) {
        setHistoryNotice(result.error);
        return;
      }

      void refreshSessions();
    },
    [ensureSession, refreshSessions]
  );

  useEffect(() => {
    async function boot() {
      try {
        const [, modelsRes] = await Promise.all([
          refreshKeys(),
          fetch("/api/models").then((r) => r.json()),
          refreshSessions(),
        ]);
        setGroups(modelsRes.groups ?? []);

        const storedMode = getStoredChatMode();
        setMode(storedMode);
      } finally {
        setLoadingBoot(false);
      }
    }
    void boot();
  }, [refreshKeys, refreshSessions]);

  useEffect(() => {
    if (loadingBoot || activeKeys.length === 0) return;

    const storedKeyId = getStoredChatKeyId();
    const validStored =
      storedKeyId && activeKeys.some((k) => k.id === storedKeyId);
    const nextKeyId = validStored ? storedKeyId : activeKeys[0].id;

    if (nextKeyId !== selectedKeyId) {
      setSelectedKeyId(nextKeyId);
      setStoredChatKeyId(nextKeyId);
    }
  }, [loadingBoot, activeKeys, selectedKeyId]);

  useEffect(() => {
    if (!selectedKey || availableModels.length === 0) {
      setModel("");
      return;
    }

    const storedModel = getStoredChatModel(mode);
    const nextModel = pickDefaultModel(
      availableModels,
      storedModel || selectedKey.default_model_id
    );
    setModel(nextModel);
    if (nextModel) setStoredChatModel(mode, nextModel);
  }, [selectedKey, availableModels, mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  function handleKeyChange(keyId: string) {
    setSelectedKeyId(keyId);
    setStoredChatKeyId(keyId);
    setMessages([]);
    setBillingNote("");
    setActiveSessionId(null);
  }

  function handleModeChange(nextMode: ChatMode) {
    setMode(nextMode);
    setStoredChatMode(nextMode);
    setMessages([]);
    setBillingNote("");
    setActiveSessionId(null);
  }

  function handleModelChange(nextModel: string) {
    setModel(nextModel);
    setStoredChatModel(mode, nextModel);
  }

  function handleNewChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput("");
    setBillingNote("");
    setBusy(false);
    setActiveSessionId(null);
    assistantContentRef.current = "";
  }

  async function handleLoadSession(targetId: string) {
    if (busy || loadingSessionId === targetId) return;

    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setLoadingSessionId(targetId);
    setBillingNote("");

    const result = await fetchChatSession(targetId);
    setLoadingSessionId(null);

    if ("error" in result) {
      setHistoryNotice(result.error);
      return;
    }

    const { session, messages: stored } = result.detail;
    setActiveSessionId(session.id);
    setMode(session.mode);
    setStoredChatMode(session.mode);
    setModel(session.model_id);
    setStoredChatModel(session.mode, session.model_id);

    if (
      session.api_key_id &&
      activeKeys.some((k) => k.id === session.api_key_id)
    ) {
      setSelectedKeyId(session.api_key_id);
      setStoredChatKeyId(session.api_key_id);
    }

    setMessages(
      stored.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        media: m.media_json ?? undefined,
        error: m.is_error,
      }))
    );
    setHistoryNotice("");
  }

  async function handleDeleteSession(targetId: string) {
    if (!window.confirm("确定删除这条对话记录？")) return;

    const result = await deleteChatSessionRemote(targetId);
    if ("error" in result) {
      setHistoryNotice(result.error);
      return;
    }

    if (sessionIdRef.current === targetId) {
      handleNewChat();
    }
    void refreshSessions();
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.streaming ? { ...m, streaming: false } : m
      )
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy || !selectedKeyId || !model) return;
    if (turnstileRequired && !turnstileToken) {
      setBillingNote("请先完成下方人机验证");
      return;
    }

    const userMessage: UiMessage = {
      id: newMessageId(),
      role: "user",
      content: text,
    };

    setInput("");
    setBillingNote("");
    setBusy(true);

    const isFirstTurn = messages.length === 0;

    if (mode === "chat") {
      const history = [...messages, userMessage]
        .filter((m) => !m.error && m.content.trim())
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const assistantId = newMessageId();
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      assistantContentRef.current = "";

      const useWebSearch = webSearch && webSearchSupported;

      await requestChatCompletion({
        keyId: selectedKeyId,
        model,
        messages: history,
        stream: !useWebSearch,
        webSearch: useWebSearch,
        signal: controller.signal,
        turnstileToken,
        onDelta: (delta) => {
          assistantContentRef.current += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + delta }
                : m
            )
          );
        },
        onComplete: (billing) => {
          const assistantText = assistantContentRef.current;
          assistantContentRef.current = "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m
            )
          );
          void persistExchange(
            text,
            { content: assistantText || "（无回复内容）" },
            { isFirstTurn }
          );
          const note = formatBillingNote(billing, accountBalance);
          if (note) setBillingNote(note);
          void refreshKeys();
          setBusy(false);
          abortRef.current = null;
        },
        onError: (message) => {
          assistantContentRef.current = "";
          setMessages((prev) => {
            const withoutEmpty = prev.filter(
              (m) => !(m.id === assistantId && !m.content)
            );
            return [
              ...withoutEmpty,
              {
                id: assistantId,
                role: "assistant",
                content: message,
                error: true,
                streaming: false,
              },
            ];
          });
          void persistExchange(
            text,
            { content: message, error: true },
            { isFirstTurn }
          );
          setBusy(false);
          abortRef.current = null;
        },
      });
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    const assistantId = newMessageId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: mode === "video" ? "视频生成中，请稍候…" : "图像生成中…",
        streaming: true,
      },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    const result = await requestGeneration({
      keyId: selectedKeyId,
      model,
      prompt: text,
      signal: controller.signal,
      turnstileToken,
    });

    abortRef.current = null;
    setBusy(false);

    if (!result.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: result.message,
                error: true,
                streaming: false,
              }
            : m
        )
      );
      void persistExchange(
        text,
        { content: result.message, error: true },
        { isFirstTurn }
      );
      return;
    }

    const media = parseGenerationResponse(result.data);
    const assistantContent = media
      ? mode === "video"
        ? "视频已生成"
        : "图像已生成"
      : "生成完成，但未返回可预览的媒体";

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              content: assistantContent,
              media: media ?? undefined,
              streaming: false,
            }
          : m
      )
    );

    void persistExchange(
      text,
      { content: assistantContent, media: media ?? undefined },
      { isFirstTurn }
    );

    const note = formatBillingNote(result.billing, accountBalance);
    if (note) setBillingNote(note);
    void refreshKeys();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (loadingBoot) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中…
      </div>
    );
  }

  if (activeKeys.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated/60 p-8 text-center">
        <p className="text-sm text-muted">
          你还没有可用的 API Key。请先在令牌管理创建密钥，再回来开始对话。
        </p>
        <Link
          href="/console"
          className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-accent to-accent-dark px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          前往令牌管理
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-72">
        <div className="rounded-xl border border-border bg-surface-elevated/60 p-4">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            API Key
          </label>
          <select
            value={selectedKeyId}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
          >
            {activeKeys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.key_prefix})
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            登录后选择令牌即可调用，按平台价目从账户余额扣费。
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated/60 p-4">
          <p className="mb-2 text-xs font-medium text-muted">模式</p>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleModeChange(id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors",
                  mode === id
                    ? "border-accent bg-accent/10 text-accent-dark"
                    : "border-border bg-background text-muted hover:border-accent/40"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated/60 p-4">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            模型
          </label>
          {availableModels.length === 0 ? (
            <p className="text-xs text-amber-700">
              当前 Key 在「{modeLabel(mode)}」模式下无可用模型，请在
              <Link href="/console" className="mx-0.5 underline">
                令牌管理
              </Link>
              调整分组权限。
            </p>
          ) : (
            <>
              <select
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {mode === "chat" && (
          <div className="rounded-xl border border-border bg-surface-elevated/60 p-4">
            <label
              className={cn(
                "flex items-start gap-3",
                webSearchSupported ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={webSearch && webSearchSupported}
                disabled={!webSearchSupported}
                onChange={(e) => setWebSearch(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent/50"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Globe className="h-3.5 w-3.5 text-accent" />
                  联网搜索
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {webSearchSupported
                    ? "开启后可检索实时网页（OpenAI / Gemini）；可能增加上游搜索费用"
                    : "该厂商暂不支持原生联网"}
                </span>
              </span>
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          新对话
        </button>

        <ChatHistoryPanel
          sessions={sessions}
          activeSessionId={sessionId}
          loading={sessionsLoading}
          loadingSessionId={loadingSessionId}
          onSelect={(id) => void handleLoadSession(id)}
          onDelete={(id) => void handleDeleteSession(id)}
        />

        {historyNotice && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {historyNotice}
          </p>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-border bg-accent/5 px-4 py-3 text-xs text-accent-dark">
          <Wallet className="h-4 w-4 shrink-0" />
          <span>账户余额 ¥{accountBalance.toFixed(2)}</span>
          <Link href="/recharge" className="ml-auto underline">
            充值
          </Link>
        </div>
      </aside>

      <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated/40">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-accent/50" />
              <p className="text-sm font-medium text-foreground">
                {modeLabel(mode)} · {selectedModelMeta?.name ?? "选择模型"}
              </p>
              <p className="mt-1 max-w-md text-xs text-muted">
                {mode === "chat"
                  ? "支持多轮对话与流式输出，费用按 token 从账户余额扣除。"
                  : mode === "video"
                    ? "视频生成可能需要 1–2 分钟，完成后可预览与下载。"
                    : "输入描述即可生成图像，支持预览与下载。"}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-gradient-to-r from-accent to-accent-dark text-white"
                      : message.error
                        ? "border border-red-200 bg-red-50 text-red-800"
                        : "border border-border bg-background text-foreground"
                  )}
                >
                  {message.content && (
                    message.role === "assistant" && !message.error ? (
                      <ChatMessageContent
                        content={message.content}
                        streaming={message.streaming}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                        {message.streaming && (
                          <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                        )}
                      </p>
                    )
                  )}
                  {message.media && (
                    <GenerationMediaPreview
                      media={message.media}
                      modelId={model}
                      className="mt-3"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border bg-background/80 p-4">
          {billingNote && (
            <p className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent-dark">
              {billingNote}
            </p>
          )}

          {turnstileRequired && (
            <div className="mb-3">
              <TurnstileWidget
                onToken={setTurnstileToken}
                className="min-h-[65px]"
              />
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={busy || !model || availableModels.length === 0}
              placeholder={modePlaceholder(mode)}
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
            {busy ? (
              <button
                type="button"
                onClick={stopGenerating}
                className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition-colors hover:border-red-200 hover:text-red-600"
                title="停止"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={
                  !input.trim() ||
                  !model ||
                  availableModels.length === 0 ||
                  (turnstileRequired && !turnstileToken)
                }
                className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white transition-all hover:brightness-110 disabled:opacity-50"
                title="发送"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
