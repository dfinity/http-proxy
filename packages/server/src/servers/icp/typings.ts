import { ActorSubclass, HttpAgent } from '@dfinity/agent';
import { Certificate } from '@dfinity/http-proxy-core';
import { Principal } from '@dfinity/principal';
import { _SERVICE } from '~src/commons/http-interface/canister_http_interface_types';

export interface ICPServerOpts {
  host: string;
  port: number;
  certificate: {
    default: Certificate;
    create(servername: string): Promise<Certificate>;
  };
}
export interface FetchAssetRequest {
  url: string;
  method: string;
  body: Uint8Array;
  headers: [string, string][];
}

export interface FetchAssetResponse {
  body: Uint8Array;
  encoding: string;
  headers: [string, string][];
  statusCode: number;
}

export interface FetchAssetData {
  updateCall: boolean;
  request: FetchAssetRequest;
  response: FetchAssetResponse;
}

export type FetchAssetResult =
  | {
      ok: false;
      error: unknown;
    }
  | {
      ok: true;
      data: FetchAssetData;
    };

export interface FetchAssetOptions {
  request: Request;
  canister: Principal;
  agent: HttpAgent;
  actor: ActorSubclass<_SERVICE>;
  certificateVersion: number;
}

export enum HTTPHeaders {
  Vary = 'vary',
  CacheControl = 'cache-control',
  Range = 'range',
  ContentEncoding = 'content-encoding',
  ContentLength = 'content-length',
  ServiceWorker = 'service-worker',
  Referer = 'referer',
  ContentType = 'content-type',
}

export enum HTTPMethods {
  GET = 'GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export interface VerifiedResponse {
  response: Response;
  certifiedHeaders: Headers;
}

export interface HttpResponse {
  status: number;
  headers: Headers;
  body: Uint8Array;
}
