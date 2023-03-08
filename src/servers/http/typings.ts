import { Certificate } from "src/tls";

export interface HTTPServerOpts {
  host: string;
  port: number;
  certificate: {
    default: Certificate;
    create(servername: string): Promise<Certificate>;
  };
}
