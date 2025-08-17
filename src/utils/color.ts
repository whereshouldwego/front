// 고가독성, 비교적 색각이상 친화적인 팔레트 (ColorBrewer/Tableau 계열 혼합, 중간 명도 유지)
const DISTINCT_PALETTE = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // yellow-green
  '#17becf', // cyan
  '#e41a1c', // red (alt)
  '#377eb8', // blue (alt)
  '#4daf4a', // green (alt)
  '#984ea3', // purple (alt)
  '#ff7f00', // orange (alt)
  '#a65628', // brown (alt)
  '#f781bf', // pink (alt)
  '#999999', // gray (alt)
  '#66c2a5', // greenish
  '#fc8d62', // orangeish
];

export function colorFromString(input: string): string {
  // 안정적 해시 → 팔레트 인덱스
  let hash = 0 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash * 31) + input.charCodeAt(i)) >>> 0;
  }
  const idx = hash % DISTINCT_PALETTE.length;
  return DISTINCT_PALETTE[idx];
}


