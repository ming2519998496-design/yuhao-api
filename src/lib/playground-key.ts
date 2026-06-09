const STORAGE_KEY = "yuhao_playground_api_key";

export function getPlaygroundApiKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setPlaygroundApiKey(key: string) {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed);
  else sessionStorage.removeItem(STORAGE_KEY);
}
