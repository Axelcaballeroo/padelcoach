import { PaymentsManager } from "@/components/payments/payments-manager";
import { requireUser } from "@/lib/auth";

export default async function PagosPage() {
  const user = await requireUser();

  return <PaymentsManager coachId={user.id} />;
}
