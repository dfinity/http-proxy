import { pki } from 'node-forge';
import { Certificate } from './certificate';

export interface KeyPair {
  private: string;
  public: string;
}

export interface CertificateOpts {
  key: pki.PrivateKey;
  public: pki.PublicKey;
  pem: string;
}

export interface CertificateConfiguration {
  creationRetries?: number;
  storage: {
    hostPrefix: string;
    folder: string;
  };
  rootca: {
    commonName: string;
    organizationName: string;
    organizationUnit: string;
  };
}

export type CreateCertificateOpts =
  | {
      type: 'ca';
    }
  | {
      type: 'domain';
      hostname: string;
      ca: Certificate;
    };

export interface GenerateKeyPairOpts {
  bits?: number;
}

export interface GenerateCertificateOpts {
  publicKey: pki.PublicKey;
  subject: pki.CertificateField[];
  issuer: pki.CertificateField[];
  extensions: object[];
  signingKey: pki.PrivateKey;
}

export interface CertificateStoreConfiguration {
  folder: string;
}

export interface CertificateDTO {
  id: string;
  pem: {
    key: string;
    publicKey: string;
    cert: string;
  };
}
