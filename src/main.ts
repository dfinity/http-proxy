import dnsServer from "./dns";
import httpServer from "./http";

const servers = [dnsServer, httpServer];

(async (): Promise<void> => {
  for (const initServer of servers) {
    await initServer();
  }
})();
