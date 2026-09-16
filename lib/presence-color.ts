const PRESENCE_COLORS = [
  "#E11D48",
  "#2563EB",
  "#16A34A",
  "#D97706",
  "#7C3AED",
  "#0F766E",
  "#C2410C",
  "#4F46E5",
]

export function presenceColorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length]
}
