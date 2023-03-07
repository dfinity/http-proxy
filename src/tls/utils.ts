import crypto from "node:crypto";
import {
  GenerateCertificateOpts,
  GenerateKeyPairOpts,
  KeyPair,
} from "./typings";
import { pki } from "node-forge";

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
  signingKey
}: GenerateCertificateOpts): Promise<string> => {
  const certificate = pki.createCertificate();

  certificate.publicKey = publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = createValidityDate();
  certificate.validity.notAfter = createValidityDate(365);

  certificate.setSubject(subject);
  certificate.setIssuer(issuer);
  certificate.setExtensions(extensions);

  certificate.sign(signingKey);

  return pki.certificateToPem(certificate);

  // crypto.cert(
  //   {
  //     subject: {
  //       country: "US",
  //       state: "California",
  //       locality: "San Francisco",
  //       organization: "My Organization",
  //       commonName: "My Root CA",
  //     },
  //     issuer: {
  //       country: "US",
  //       state: "California",
  //       locality: "San Francisco",
  //       organization: "My Organization",
  //       commonName: "My Root CA",
  //     },
  //     serialNumber: "01",
  //     notBefore: new Date(),
  //     notAfter: new Date(new Date().getFullYear() + 10, 0),
  //     keyUsage: crypto.constants.keyCertSign,
  //     extensions: [
  //       {
  //         name: "basicConstraints",
  //         cA: true,
  //       },
  //     ],
  //   },
  //   key.privateKey
  // );
};
