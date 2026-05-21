import { ClassesManager } from "@/components/classes/classes-manager";
import { requireUser } from "@/lib/auth";

export default async function AgendaPage() {
  const user = await requireUser();

  return <ClassesManager coachId={user.id} />;
}
