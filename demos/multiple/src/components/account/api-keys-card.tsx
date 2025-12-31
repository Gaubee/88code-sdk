import { Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard, QueryErrorFallback } from "@/components/ui/card-error-boundary";
import { useApiKeys } from "@/lib/queries";
import type { Account } from "@/lib/accounts-store";

interface Props {
  account: Account;
}

export function ApiKeysCard({ account }: Props) {
  const { data: apiKeys, isLoading, error, refetch } = useApiKeys(account);

  if (isLoading) {
    return <LoadingCard title="API Keys" />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        title="API Keys"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  const keys = apiKeys ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="size-4" />
          API Keys ({keys.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">暂无 API Key</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-2 border rounded text-xs"
              >
                <div>
                  <div className="font-medium">{key.name || "(未命名)"}</div>
                  <code className="text-muted-foreground">{key.maskedApiKey}</code>
                </div>
                <div className="text-right">
                  <div>{(key.totalRequests ?? 0).toLocaleString()} 请求</div>
                  <div className="text-muted-foreground">
                    ${(key.totalCost ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
