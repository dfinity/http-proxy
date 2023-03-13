import { Principal } from '@dfinity/principal';

export const CANISTER_DNS_PREFIX = '_canister-id';
export const DEFAULT_GATEWAY = new URL('https://icp-api.io');

export const hostnameCanisterIdMap: Map<string, Principal> = new Map(
  Object.entries({
    'identity.ic0.app': Principal.from('rdmx6-jaaaa-aaaaa-aaadq-cai'),
    'nns.ic0.app': Principal.from('qoctq-giaaa-aaaaa-aaaea-cai'),
  })
);
