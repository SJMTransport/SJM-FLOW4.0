import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SeriesPage() {
  return (
    <div>
      <PageHeader
        title="Series"
        subtitle="Kelompokkan konten dalam seri yang terstruktur"
        action={{ label: "+ Seri Baru", href: "/series/new" }}
      />
      <EmptyState
        icon="🎬"
        title="Belum ada seri"
        description="Buat seri konten untuk mengorganisir konten yang saling berkaitan."
      />
    </div>
  );
}
