import { resolve } from 'path';
import { Certificate } from './certificate';
import { CertificateDTO, CertificateStoreConfiguration } from './typings';
import { createDir, getFile, saveFile, coreConfigs } from '../commons';

export class CertificateStore {
  private readonly storePath: string;

  private constructor(
    private readonly configuration: CertificateStoreConfiguration
  ) {
    this.storePath = resolve(coreConfigs.dataPath, this.configuration.folder);
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
    const dtoPath = this.certificateDtoPath(id);
    const fileData = await getFile(dtoPath, { encoding: coreConfigs.encoding });

    if (!fileData) {
      return null;
    }

    const certData = JSON.parse(fileData) as CertificateDTO;
    return Certificate.restore(certData);
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
  }

  public static async create(
    configuration: CertificateStoreConfiguration
  ): Promise<CertificateStore> {
    const store = new CertificateStore(configuration);

    await store.init();

    return store;
  }
}
