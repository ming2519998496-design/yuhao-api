/** GPT Image 官方按 Token 计价；平台按次扣费时用标准单张折算 */

export type GptImageBillingSpec = {
  in: number;
  out: number;
  imageBilling: {
    defaultPromptTokens: number;
    defaultOutputTokens: number;
    quality?: string;
    size?: string;
  };
};

/** 官方 USD/张（medium 1024×1024 参考，含 prompt tokens） */
export function computeGptImageOfficialUsdPerRequest(
  spec: GptImageBillingSpec
): number {
  const prompt = spec.imageBilling.defaultPromptTokens;
  const output = spec.imageBilling.defaultOutputTokens;
  return (prompt / 1_000_000) * spec.in + (output / 1_000_000) * spec.out;
}

export function formatGptImageOfficialLabel(spec: GptImageBillingSpec): string {
  const inUsd = spec.in;
  const outUsd = spec.out;
  const perImage = computeGptImageOfficialUsdPerRequest(spec);
  return `$${inUsd}/1M 输入 · $${outUsd}/1M 输出（约 $${perImage.toFixed(3)}/张 medium 1024）`;
}
