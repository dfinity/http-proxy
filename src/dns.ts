import dns from "node:dns";
import { Packet, default as dns2 } from "dns2";

// Set's the fallback servers for nodejs to use
const listenAddress = "127.0.0.1";
const fallbackDns = "8.8.8.8";

const fallbackServers = Array.from(
  new Set([
    ...dns
      .getServers()
      .filter((serverAddress) => listenAddress !== serverAddress),
    fallbackDns,
  ])
);
dns.setServers(fallbackServers);

const icDomains = new Set([
  "nns.ic0.app",
  "identity.ic0.app",
  "internetcomputer.org",
]);

type DnsQuestion = dns2.DnsQuestion & { type: number };
const queryType: { [key: number]: string } = {};
Object.entries(Packet.TYPE).forEach(([typeName, typeId]) => {
  queryType[typeId] = typeName;
});

// DNS Server implementation
const server = dns2.createServer({
  udp: true,
  handle: (request, send, _rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    const [question] = request.questions;
    const { name, type } = question as DnsQuestion;
    const isIcDomain = icDomains.has(name);
    const hasType = queryType[type] !== undefined;
    if (!hasType) {
      send(response);
      return;
    }
    if (!isIcDomain) {
      dns.resolve(name, queryType[type], (_err, addresses) => {
        if (!Array.isArray(addresses)) {
          send(response);
          return;
        }
        for (const address of addresses) {
          response.answers.push({
            name,
            type,
            class: Packet.CLASS.IN,
            ttl: 300,
            address: String(address),
          });
        }

        send(response);
      });
      return;
    }

    if (type === Packet.TYPE.A) {
      response.answers.push({
        name,
        type: Packet.TYPE.A,
        class: Packet.CLASS.IN,
        ttl: 300,
        address: "127.0.0.1",
      });
    }

    if (type === Packet.TYPE.AAAA) {
      response.answers.push({
        name,
        type: Packet.TYPE.AAAA,
        class: Packet.CLASS.IN,
        ttl: 300,
        address: "::1",
      });
    }

    send(response);
  },
});

server.on("request", (request, _response, _rinfo) => {
  console.log(`query ${request.header.id}:`, request.questions[0]);
});

server.on("requestError", (error) => {
  console.log("Client sent an invalid request", error);
});

server.on("listening", () => {
  const { udp } = server.addresses();
  if (udp === undefined) {
    server.close();
    return;
  }

  console.info(
    `DNS server started listening on udp://${udp.address}:${udp.port}`
  );
});

server.on("close", () => {
  console.info("DNS server shutting down");
});

const startServer = async (): Promise<void> => {
  server.listen({ udp: 53 });
};

export default startServer;
