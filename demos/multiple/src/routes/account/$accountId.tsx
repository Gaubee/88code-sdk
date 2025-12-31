import { createFileRoute } from "@tanstack/react-router";
import { AccountDetail } from "@/components/account-detail";

export const Route = createFileRoute("/account/$accountId")({
  component: AccountPage,
});

function AccountPage() {
  const { accountId } = Route.useParams();
  return <AccountDetail accountId={accountId} />;
}
