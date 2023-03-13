export enum BackgroundEventTypes {
  Ping = 'ping',
  SetupSystem = 'setup-system',
}

export interface SetupSystemMessage {
  type: BackgroundEventTypes.SetupSystem;
  data: {
    commonName: string;
    certificatePath: string;
  };
}

export type BackgroundEventMessage = { type?: string } | SetupSystemMessage;

export type BackgroundResultMessage = {
  processed: boolean;
  data?: unknown;
  err?: string;
};
