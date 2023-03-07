import https from "https";
import { createSecureContext } from "tls";
import { Certificate } from "./tls";

const host = "127.0.0.1";
const port = 443;

type CertificateResult = { key: string; cert: string };

const fetchDomainCertificate = async (
  hostname: string
): Promise<CertificateResult> => {
  return new Promise<CertificateResult>(async (ok) => {
    const cert = await Certificate.create(hostname);

    ok(cert);
  });
};

const startServer = async (): Promise<void> => {
  const proxyCert = await Certificate.create("localhost");

  var server = https.createServer(
    {
      key: proxyCert.key,
      cert: proxyCert.cert,
      SNICallback: async (servername: string, cb) => {
        const cert = await fetchDomainCertificate(servername);
        const ctx = createSecureContext(cert);
        cb(null, ctx);
      },
    },
    function (req, res) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("IC HTTP Gateway Server");
    }
  );

  server.listen(port);
  console.info(`HTTP server started listening on http://${host}:${port}`);
};

export default startServer;
