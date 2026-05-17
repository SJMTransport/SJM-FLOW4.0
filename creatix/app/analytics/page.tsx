import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Performa konten dan akun sosial mediamu"
      />
      <EmptyState
        icon="📊"
        title="Belum ada data performa"
        description="Data performa akan muncul setelah kontenmu dipublikasikan dan dicatat."
      />
    </div>
  );
}
