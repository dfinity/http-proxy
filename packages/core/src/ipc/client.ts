import net from 'node:net';
import { EventMessage, IPCClientOptions, ResultMessage } from './typings';

export class IPCClient {
  public constructor(private readonly options: IPCClientOptions) {}

  public async sendMessage<T>(event: EventMessage): Promise<ResultMessage<T>> {
    return new Promise<ResultMessage<T>>((ok, err) => {
      const socket = net.createConnection({ path: this.options.path }, () => {
        socket.write(JSON.stringify(event));

        socket.on('data', (data) => {
          const result = JSON.parse(data.toString()) as ResultMessage<T>;

          ok(result);
        });
      });

      socket.on('error', (error) => {
        err(error);
      });
    });
  }
}
