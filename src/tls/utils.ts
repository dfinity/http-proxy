import { md, pki } from "node-forge";
import { GenerateCertificateOpts, GenerateKeyPairOpts } from "./typings";

export const DEFAULT_KEY_PAIR_BITS = 2048;

export const generateKeyPair = async (
  opts?: GenerateKeyPairOpts
): Promise<pki.rsa.KeyPair> => {
  return pki.rsa.generateKeyPair(opts?.bits ?? DEFAULT_KEY_PAIR_BITS);
};

export const createValidityDate = (addDays: number = 0): Date => {
  const current = new Date();
  current.setDate(current.getDate() + addDays);

  return current;
};

export const generateCertificate = async ({
  publicKey,
  subject,
  issuer,
  extensions,
  signingKey,
}: GenerateCertificateOpts): Promise<string> => {
  const certificate = pki.createCertificate();

  certificate.publicKey = publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = createValidityDate();
  certificate.validity.notAfter = createValidityDate(365);

  certificate.setSubject(subject);
  certificate.setIssuer(issuer);
  certificate.setExtensions(extensions);

  certificate.sign(signingKey, md.sha256.create());

  return pki.certificateToPem(certificate);
};
