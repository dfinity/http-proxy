import { Certificate } from "src/tls";

export interface ICPServerOpts {
  host: string;
  port: number;
  certificate: {
    default: Certificate;
    create(servername: string): Promise<Certificate>;
  };
}
