import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ReferencesPage() {
  return (
    <div>
      <PageHeader
        title="Reference Bank"
        subtitle="Simpan referensi dan inspirasi konten"
        action={{ label: "+ Tambah Referensi", href: "/references/new" }}
      />
      <EmptyState
        icon="🔗"
        title="Belum ada referensi"
        description="Simpan link, artikel, dan inspirasi sebagai referensi pembuatan kontenmu."
      />
    </div>
  );
}
