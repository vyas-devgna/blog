export function getReadingTime(content: string) {
  const words = content.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  return Math.max(1, Math.ceil(words.length / 230));
}
