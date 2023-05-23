import { rmSync } from 'fs';
import InMemoryCache from 'node-cache';
import { resolve } from 'path';
import {
  coreConfigs,
  createDir,
  getFile,
  getFiles,
  pathExists,
  saveFile,
} from '../commons';
import { Certificate } from './certificate';
import { CertificateDTO, CertificateStoreConfiguration } from './typings';

export class CertificateStore {
  private readonly storePath: string;
  private static cachedLookups = new InMemoryCache({
    stdTTL: 60 * 5, // 5 minutes
    maxKeys: 250,
  });

  private constructor(
    private readonly configuration: CertificateStoreConfiguration
  ) {
    this.storePath = resolve(coreConfigs.dataPath, this.configuration.folder);
  }

  private static maybeGetFromCache(id: string): Certificate | undefined {
    return CertificateStore.cachedLookups.get<Certificate>(id);
  }

  private static maybeSetInCache(id: string, certificate: Certificate): void {
    try {
      CertificateStore.cachedLookups.set(id, certificate);
    } catch (_e) {
      // cache is full
    }
  }

  private static deleteFromCache(id: string): void {
    CertificateStore.cachedLookups.del(id);
  }

  private async init(): Promise<void> {
    createDir(this.storePath);
  }

  private certificateDtoPath(id: string): string {
    return resolve(this.storePath, `${id}.json`);
  }

  public certificatePath(id: string): string {
    return resolve(this.storePath, `${id}.cert`);
  }

  public async find(id: string): Promise<Certificate | null> {
    let certificate = CertificateStore.maybeGetFromCache(id);
    if (!certificate) {
      const dtoPath = this.certificateDtoPath(id);
      const fileData = await getFile(dtoPath, {
        encoding: coreConfigs.encoding,
      });

      if (!fileData) {
        return null;
      }

      const certData = JSON.parse(fileData) as CertificateDTO;
      certificate = Certificate.restore(certData);
    }

    // this prevents expired certificates from being sent to the client
    if (certificate.shouldRenew) {
      this.delete(id);
      return null;
    }

    return certificate;
  }

  public getIssuedCertificatesIds(): string[] {
    const files = getFiles(this.storePath, ['json']);

    return files.map((file) => file.replace(/.json$/, ''));
  }

  public async delete(id: string): Promise<void> {
    CertificateStore.deleteFromCache(id);

    const dtoPath = this.certificateDtoPath(id);
    if (await pathExists(dtoPath)) {
      rmSync(dtoPath, { force: true });
    }

    const certPath = this.certificatePath(id);
    if (await pathExists(certPath)) {
      rmSync(certPath, { force: true });
    }
  }

  public async save(certificate: Certificate): Promise<void> {
    const certPath = this.certificatePath(certificate.id);
    const dtoPath = this.certificateDtoPath(certificate.id);
    const dto = certificate.toDTO();

    await saveFile(certPath, certificate.pem, {
      encoding: coreConfigs.encoding,
    });
    await saveFile(dtoPath, JSON.stringify(dto), {
      encoding: coreConfigs.encoding,
    });

    CertificateStore.maybeSetInCache(certificate.id, certificate);
  }

  public static async create(
    configuration: CertificateStoreConfiguration
  ): Promise<CertificateStore> {
    const store = new CertificateStore(configuration);

    await store.init();

    return store;
  }
}
