/**
 * 将各厂商模型常见的数学写法统一为 remark-math 可识别的 $ / $$ 分隔符。
 * - Gemini：$...$、$$...$$
 * - OpenAI / ChatGPT：\[...\]、\(...\)、[ \sqrt{...} ]
 * - DeepSeek：\boxed{...}、行内裸 LaTeX 等
 */

const LATEX_COMMAND =
  /\\(?:boxed|dfrac|tfrac|frac|sqrt|times|cdot|div|text|left|right|begin|end|quad|qquad|sum|int|lim|alpha|beta|gamma|pi|theta|leq|geq|neq|approx|pm|mp|mathrm|mathbf|displaystyle)\b/;

function isAlreadyWrapped(offset: number, match: string, full: string): boolean {
  const before = full[offset - 1];
  const after = full[offset + match.length];
  return before === "$" || after === "$";
}

function looksLikeLatex(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (LATEX_COMMAND.test(s)) return true;
  if (/[\^_]/.test(s)) return true;
  if (/\d+\s*\^/.test(s)) return true;
  if (/\\[()[\]{}]/.test(s)) return true;
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
  const trimmed = inner.trim();
  if (trimmed.startsWith("$") && trimmed.endsWith("$")) return trimmed;
  return `$${normalizeMathUnicode(trimmed)}$`;
}

function toBlockMath(inner: string): string {
  const trimmed = inner.trim();
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) return trimmed;
  return `\n$$\n${normalizeMathUnicode(trimmed)}\n$$\n`;
}

function shouldUseBlockMath(inner: string): boolean {
  const trimmed = inner.trim();
  return (
    trimmed.includes("\n") ||
    trimmed.length > 72 ||
    /\\frac|\\sqrt|\\begin|\\displaystyle/.test(trimmed)
  );
}

function isInsideMathString(offset: number, full: string): boolean {
  const before = full.slice(0, offset);
  let inMath = false;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === "\\") {
      i++;
      continue;
    }
    if (before[i] === "$") inMath = !inMath;
  }
  return inMath;
}

function wrapBoxedExpressions(text: string): string {
  const marker = "\\boxed{";
  let result = text;
  let searchFrom = 0;

  while (searchFrom < result.length) {
    const idx = result.indexOf(marker, searchFrom);
    if (idx === -1) break;
    if (isAlreadyWrapped(idx, marker, result) || isInsideMathString(idx, result)) {
      searchFrom = idx + marker.length;
      continue;
    }

    const contentStart = idx + marker.length;
    let depth = 1;
    let i = contentStart;
    while (i < result.length && depth > 0) {
      const ch = result[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) break;

    const full = result.slice(idx, i);
    const wrapped = toInlineMath(full);
    result = result.slice(0, idx) + wrapped + result.slice(i);
    searchFrom = idx + wrapped.length;
  }

  return result;
}

/** 匹配一层嵌套花括号的 LaTeX 片段 */
const NESTED_BRACE_CHUNK = /(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*/;

function convertBareLatex(text: string): string {
  let result = wrapBoxedExpressions(text);

  const barePatterns = [
    new RegExp(
      `\\\\(?:dfrac|tfrac|frac)\\{${NESTED_BRACE_CHUNK.source}\\}\\{${NESTED_BRACE_CHUNK.source}\\}`,
      "g"
    ),
    /\\sqrt\{[^{}]+\}/g,
  ];

  for (const pattern of barePatterns) {
    result = result.replace(pattern, (match, offset) => {
      if (isAlreadyWrapped(offset, match, result)) return match;
      if (isInsideMathString(offset, result)) return match;
      return toInlineMath(match);
    });
  }

  result = result.replace(
    /^([ \t]*)(\\[^\n$]+)$/gm,
    (full, indent: string, latex: string) => {
      if (!looksLikeLatex(latex)) return full;
      return `${indent}${shouldUseBlockMath(latex) ? toBlockMath(latex) : toInlineMath(latex)}`;
    }
  );

  return result;
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
      text = convertBareLatex(text);
      return text;
    })
    .join("");
}
