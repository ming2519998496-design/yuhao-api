import type { ChatMode } from "@/lib/chat-models";

const KEY_ID = "yuhao_chat_key_id";
const MODEL_PREFIX = "yuhao_chat_model_";
const MODE = "yuhao_chat_mode";

export function getStoredChatKeyId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_ID) ?? "";
}

export function setStoredChatKeyId(keyId: string) {
  if (typeof window === "undefined") return;
  if (keyId) localStorage.setItem(KEY_ID, keyId);
  else localStorage.removeItem(KEY_ID);
}

export function getStoredChatModel(mode: ChatMode): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${MODEL_PREFIX}${mode}`) ?? "";
}

export function setStoredChatModel(mode: ChatMode, modelId: string) {
  if (typeof window === "undefined") return;
  if (modelId) localStorage.setItem(`${MODEL_PREFIX}${mode}`, modelId);
  else localStorage.removeItem(`${MODEL_PREFIX}${mode}`);
}

export function getStoredChatMode(): ChatMode {
  if (typeof window === "undefined") return "chat";
  const raw = localStorage.getItem(MODE);
  if (raw === "image" || raw === "video") return raw;
  return "chat";
}

export function setStoredChatMode(mode: ChatMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE, mode);
}
