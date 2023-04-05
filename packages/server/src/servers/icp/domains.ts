import { Principal } from '@dfinity/principal';
import InMemoryCache from 'node-cache';
import { Resolver } from 'node:dns';
import { CANISTER_DNS_PREFIX, hostnameCanisterIdMap } from './static';
import { logger } from '@dfinity/http-proxy-core';

const cachedLookups = new InMemoryCache({
  stdTTL: 60 * 5, // 5 minutes
  maxKeys: 1000,
});

const dnsResolverTimeoutMs = 5000;
const dnsResolveReries = 3;

const inFlightLookups: Map<string, Promise<Principal | null>> = new Map();

export const lookupIcDomain = async (
  hostname: string
): Promise<Principal | null> => {
  const cachedLookup = cachedLookups.get<string | null>(hostname);

  if (cachedLookup !== undefined) {
    return cachedLookup !== null ? Principal.fromText(cachedLookup) : null;
  }

  const lookup = await maybeResolveIcDomain(hostname);
  try {
    cachedLookups.set(hostname, lookup !== null ? lookup.toText() : null);
  } catch (e) {
    logger.error(`Failed to save lookup in the cache(${e})`);
  }

  return lookup;
};

export const maybeResolveIcDomain = async (
  hostname: string
): Promise<Principal | null> => {
  const existingLookup = inFlightLookups.get(hostname);
  if (existingLookup !== undefined) {
    return existingLookup;
  }

  const inflightLookup = new Promise<Principal | null>(async (ok, reject) => {
    try {
      if (isRawDomain(hostname)) {
        return ok(null);
      }

      const canisterFromStaticMap = hostnameCanisterIdMap.get(hostname);
      if (canisterFromStaticMap) {
        return ok(canisterFromStaticMap);
      }

      const canisterFromHostname = maybeResolveCanisterFromHostName(hostname);
      if (canisterFromHostname) {
        return ok(canisterFromHostname);
      }

      const canisterFromDns = await maybeResolveCanisterFromDns(hostname);

      ok(canisterFromDns);
    } catch (e) {
      reject(e);
    }
  });

  inFlightLookups.set(hostname, inflightLookup);
  const lookupResult = await inflightLookup;
  inFlightLookups.delete(hostname);

  return lookupResult;
};

export function isRawDomain(hostname: string): boolean {
  // For security reasons the match is only made for ic[0-9].app, ic[0-9].dev and icp[0-9].io domains. This makes
  // the match less permissive and prevents unwanted matches for domains that could include raw
  // but still serve as a normal dapp domain that should go through response verification.
  const isIcAppRaw = !!hostname.match(new RegExp(/\.raw\.ic[0-9]+\.app/));
  const isIcDevRaw = !!hostname.match(new RegExp(/\.raw\.ic[0-9]+\.dev/));
  const isIcpIoRaw = !!hostname.match(new RegExp(/\.raw\.icp[0-9]+\.io/));
  const isTestnetRaw = !!hostname.match(
    new RegExp(/\.raw\.[\w-]+\.testnet\.[\w-]+\.network/)
  );

  return isIcAppRaw || isIcDevRaw || isIcpIoRaw || isTestnetRaw;
}

/**
 * Split a hostname up-to the first valid canister ID from the right.
 * @param hostname The hostname to analyze.
 * @returns A canister ID followed by all subdomains that are after it, or null if no canister ID were found.
 */
export function maybeResolveCanisterFromHostName(
  hostname: string
): Principal | null {
  const subdomains = hostname.split('.').reverse();
  for (const domain of subdomains) {
    try {
      return Principal.fromText(domain);
    } catch (_) {
      // subdomain did not match expected Principal format
      // continue checking each subdomain
    }
  }

  return null;
}

/**
 * Looks for the canister in the dns records of the hostname.
 * @param hostname The hostname to analyze.
 * @returns A canister ID or null if no canister ID was found.
 */
export const maybeResolveCanisterFromDns = async (
  hostname: string
): Promise<Principal | null> => {
  return new Promise<Principal | null>((ok, reject) => {
    const dnsResolver = new Resolver({
      timeout: dnsResolverTimeoutMs,
      tries: dnsResolveReries,
    });

    dnsResolver.resolveTxt(
      `${CANISTER_DNS_PREFIX}.${hostname}`,
      (err, addresses) => {
        // those codes are expected if the subdomain is not set
        if (err && ['ENOTFOUND', 'ENODATA'].includes(err.code ?? '')) {
          return ok(null);
        } else if (err) {
          return reject(err);
        }

        const [result] = addresses ?? [];
        const [canisterId] = result ?? [];

        try {
          ok(Principal.fromText(canisterId));
        } catch (e) {
          ok(null);
        }
      }
    );
  });
};
