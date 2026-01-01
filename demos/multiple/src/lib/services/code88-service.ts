import { Code88Client, Code88Queries, createMutations } from "@gaubee/88code-sdk";
import type { Account } from "../accounts-store";

export class Code88Service {
  private clients = new Map<string, Code88Client>();

  getClient(account: Pick<Account, "id" | "token" | "apiHost">): Code88Client {
    const existing = this.clients.get(account.id);
    if (existing && existing.getBaseUrl() === account.apiHost) {
      existing.setAuthToken(account.token);
      return existing;
    }
    const client = new Code88Client({
      authToken: account.token,
      baseUrl: account.apiHost,
    });
    this.clients.set(account.id, client);
    return client;
  }

  getQueries(account: Pick<Account, "id" | "token" | "apiHost">): Code88Queries {
    return new Code88Queries(this.getClient(account));
  }

  getMutations(account: Pick<Account, "id" | "token" | "apiHost">) {
    const client = this.getClient(account);
    return createMutations(client, "I_UNDERSTAND_THE_RISKS");
  }
}
