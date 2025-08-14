export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 75%, 45%)`;
}


