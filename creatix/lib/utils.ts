export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string): string {
  const d = new Date(date);
  const datePart = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} · ${hours}.${minutes}`;
}

export function estimateDuration(text: string): string {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const totalSeconds = Math.round((wordCount / 150) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `~${seconds} detik`;
  if (seconds === 0) return `~${minutes} menit`;
  return `~${minutes} menit ${seconds} detik`;
}

const STAGE_ORDER = [
  "idea",
  "scripting",
  "recording",
  "editing",
  "scheduling",
  "published",
  "reviewed",
] as const;

export function getStageIndex(stage: string): number {
  const index = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  return index === -1 ? 0 : index;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#D4880A",
  tiktok: "#7A8C5E",
  threads: "#8A8A8A",
  youtube: "#C94A3A",
  shopee: "#C49A6A",
};

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? "#8A8A8A";
}

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: "📷",
  tiktok: "📱",
  threads: "🧵",
  youtube: "📺",
  shopee: "🛍️",
};

export function getPlatformEmoji(platform: string): string {
  return PLATFORM_EMOJIS[platform.toLowerCase()] ?? "🌐";
}

export function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  if (weeks < 5) return `${weeks} minggu lalu`;
  return `${months} bulan lalu`;
}
