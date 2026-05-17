import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function IdeasPage() {
  return (
    <div>
      <PageHeader
        title="Idea Inbox"
        subtitle="Tampung semua idemu sebelum jadi konten"
        action={{ label: "+ Tambah Ide", href: "/ideas?quickadd=true" }}
      />
      <EmptyState
        icon="💡"
        title="Belum ada ide"
        description="Mulai simpan ide-ide kontenmu di sini sebelum dikembangkan lebih lanjut."
      />
    </div>
  );
}
