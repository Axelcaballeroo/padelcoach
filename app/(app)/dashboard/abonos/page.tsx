import { SubscriptionsManager } from "@/components/subscriptions/subscriptions-manager";
import { requireUser } from "@/lib/auth";

export default async function AbonosPage() {
  const user = await requireUser();

  return <SubscriptionsManager coachId={user.id} />;
}
