import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AccountsPage() {
  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Kelola akun platform sosial mediamu"
        action={{ label: "+ Tambah Akun", href: "/accounts/new" }}
      />
      <EmptyState
        icon="⚙️"
        title="Belum ada akun terhubung"
        description="Hubungkan akun Instagram, TikTok, YouTube, dan platform lainnya."
      />
    </div>
  );
}
