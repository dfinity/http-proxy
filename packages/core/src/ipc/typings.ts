export interface IPCServerOptions {
  path: string;
  onMessage?: (event: EventMessage) => Promise<unknown>;
}

export interface IPCClientOptions {
  path: string;
}

export type EventMessage = { type: string; skipWait?: boolean };

export type ResultMessage<T = unknown> = {
  processed: boolean;
  data?: T;
  err?: string;
};
