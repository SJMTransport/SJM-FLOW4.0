import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ContentPage() {
  return (
    <div>
      <PageHeader
        title="Content Studio"
        subtitle="Kelola semua kontenmu dari ide hingga tayang"
        action={{ label: "+ Konten Baru", href: "/content/new" }}
      />
      <EmptyState
        icon="📝"
        title="Belum ada konten"
        description="Buat konten pertamamu dan mulai perjalanan dari ide hingga publikasi."
      />
    </div>
  );
}
