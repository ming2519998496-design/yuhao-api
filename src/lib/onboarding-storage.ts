const DISMISS_KEY = "yuhao-onboarding-dismissed";

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissOnboarding(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, "1");
}
