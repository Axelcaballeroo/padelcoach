import { StudentsManager } from "@/components/students/students-manager";
import { requireUser } from "@/lib/auth";

export default async function AlumnosPage() {
  const user = await requireUser();

  return <StudentsManager coachId={user.id} />;
}
