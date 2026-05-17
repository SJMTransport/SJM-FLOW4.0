import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const today = formatDate(new Date().toISOString());

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={today}
        action={{ label: "+ Konten Baru", href: "/content/new" }}
      />
      <EmptyState
        icon="🏠"
        title="Selamat datang di Creatix"
        description="Dashboard akan menampilkan ringkasan konten, pipeline, dan performa akunmu."
      />
    </div>
  );
}
