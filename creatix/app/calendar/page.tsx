import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Jadwal publikasi kontenmu"
      />
      <EmptyState
        icon="📅"
        title="Kalender kosong"
        description="Jadwalkan kontenmu agar muncul di kalender publikasi."
      />
    </div>
  );
}
