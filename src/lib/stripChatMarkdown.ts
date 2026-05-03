/**
 * Gỡ ký hiệu Markdown thường gặp trong phản hồi model để hiển thị plain text trong chat.
 */
export function stripChatMarkdown(text: string): string {
  let s = text;
  for (let i = 0; i < 8; i++) {
    const next = s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1");
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\*([^*\n]+)\*/g, "$1");
  s = s.replace(/_([^_\n]+)_/g, "$1");
  return s.trimEnd();
}
