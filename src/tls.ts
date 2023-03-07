import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type CertificateResult = { key: string; cert: string };

const baseConfig = readFileSync("base.domain.conf", "utf8");

export class Certificate {
  static domainsCertPath = "cert/domains";
  static serialPath = "cert/serial";
  static newCertsPath = "cert/newcerts";
  static caIndexPath = "cert/index.txt";

  private static async createConfig(hostname: string): Promise<void> {
    mkdirSync(Certificate.domainsCertPath, { recursive: true });

    writeFileSync(
      Certificate.configPath(hostname),
      baseConfig.replaceAll("{hostname}", hostname)
    );
  }

  private static async exists(hostname: string): Promise<boolean> {
    const keyPath = Certificate.keyPath(hostname);
    const certPath = Certificate.certPath(hostname);

    return existsSync(keyPath) && existsSync(certPath);
  }

  private static configPath(hostname: string): string {
    return join(Certificate.domainsCertPath, `${hostname}.conf`);
  }

  private static keyPath(hostname: string): string {
    return join(Certificate.domainsCertPath, `${hostname}.key`);
  }

  private static certPath(hostname: string): string {
    return join(Certificate.domainsCertPath, `${hostname}.crt`);
  }

  private static csrPath(hostname: string): string {
    return join(Certificate.domainsCertPath, `${hostname}.csr`);
  }

  private static async generateSerial(): Promise<void> {
    if (existsSync(Certificate.serialPath)) {
      return;
    }

    writeFileSync(Certificate.serialPath, "00", { encoding: "ascii" });
  }

  private static async generateCaIndex(): Promise<void> {
    if (existsSync(Certificate.caIndexPath)) {
      return;
    }

    writeFileSync(Certificate.caIndexPath, "", { encoding: "utf8" });
  }

  private static async generateNewCerts(): Promise<void> {
    if (existsSync(Certificate.newCertsPath)) {
      return;
    }

    mkdirSync(Certificate.newCertsPath, { recursive: true });
  }

  private static async createAndSign(hostname: string): Promise<void> {
    const csrPath = Certificate.csrPath(hostname);
    const certPath = Certificate.certPath(hostname);
    const configPath = Certificate.configPath(hostname);

    execSync(`openssl req -new -out ${csrPath} -config ${configPath}`, {
      stdio: "pipe",
    });
    execSync(
      `openssl ca -batch -config sign.ca.conf -extfile ${configPath} -extensions my_extensions -out ${certPath} -infiles ${csrPath}`,
      { stdio: "pipe" }
    );
  }

  static async create(hostname: string): Promise<CertificateResult> {
    const exists = await Certificate.exists(hostname);
    if (exists) {
      return {
        key: readFileSync(Certificate.keyPath(hostname), "utf8"),
        cert: readFileSync(Certificate.certPath(hostname), "utf8"),
      };
    }

    await Certificate.generateNewCerts();
    await Certificate.generateSerial();
    await Certificate.generateCaIndex();
    await Certificate.createConfig(hostname);
    await Certificate.createAndSign(hostname);

    return {
      key: readFileSync(Certificate.keyPath(hostname), "utf8"),
      cert: readFileSync(Certificate.certPath(hostname), "utf8"),
    };
  }
}
