/**
 * 将各厂商模型常见的数学写法统一为 remark-math 可识别的 $ / $$ 分隔符。
 * - Gemini：$...$、$$...$$
 * - OpenAI / ChatGPT：\[...\]、\(...\)、[ \sqrt{...} ]
 */

const LATEX_COMMAND =
  /\\(?:frac|sqrt|times|cdot|div|text|left|right|begin|end|quad|qquad|sum|int|lim|alpha|beta|gamma|pi|theta|leq|geq|neq|approx|pm|mp)\b/;

function looksLikeLatex(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (LATEX_COMMAND.test(s)) return true;
  if (/[\^_]/.test(s)) return true;
  if (/\d+\s*\^/.test(s)) return true;
  if (/\\[()[\]{}]/.test(s)) return true;
  // 纯算式行，如 [ = 1 ]、[ (a-b)^2 = 4 ]
  if (
    s.length <= 48 &&
    /^[\s=+\-*/().,0-9a-zA-Z^\\{}[\]|]+$/.test(s) &&
    /[=^\\()]/.test(s)
  ) {
    return true;
  }
  return false;
}

function normalizeMathUnicode(math: string): string {
  return math
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/−/g, "-")
    .replace(/·/g, "\\cdot ");
}

function toInlineMath(inner: string): string {
  return `$${normalizeMathUnicode(inner.trim())}$`;
}

function toBlockMath(inner: string): string {
  return `\n$$\n${normalizeMathUnicode(inner.trim())}\n$$\n`;
}

function shouldUseBlockMath(inner: string): boolean {
  const trimmed = inner.trim();
  return (
    trimmed.includes("\n") ||
    trimmed.length > 72 ||
    /\\frac|\\sqrt|\\begin|\\displaystyle/.test(trimmed)
  );
}

function convertBracketMath(text: string): string {
  return text.replace(/\[\s*([\s\S]*?)\s*\]/g, (match, inner, offset, full) => {
    if (!looksLikeLatex(inner)) return match;
    const after = full.slice(offset + match.length);
    if (after.startsWith("(")) return match;
    return shouldUseBlockMath(inner)
      ? toBlockMath(inner)
      : toInlineMath(inner);
  });
}

function convertLatexDelimiters(text: string): string {
  let result = text;
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) =>
    toBlockMath(math)
  );
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) =>
    toInlineMath(math)
  );
  return result;
}

function convertFencedMath(text: string): string {
  return text.replace(
    /```(?:math|latex)\s*\n([\s\S]*?)```/gi,
    (_, math) => toBlockMath(math)
  );
}

/** 跳过代码块，仅处理正文中的数学分隔符 */
export function normalizeChatMathDelimiters(content: string): string {
  const segments = content.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith("```")) return segment;
      let text = segment;
      text = convertFencedMath(text);
      text = convertLatexDelimiters(text);
      text = convertBracketMath(text);
      return text;
    })
    .join("");
}
