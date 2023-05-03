import { Actor, ActorSubclass, HttpAgent, concat } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import {
  getMaxVerificationVersion,
  getMinVerificationVersion,
  verifyRequestResponsePair,
} from '@dfinity/response-verification/nodejs/nodejs.js';
import { IncomingMessage } from 'http';
import { inflate, ungzip } from 'pako';
import { idlFactory } from '~src/commons/http-interface/canister_http_interface';
import {
  HttpRequest,
  _SERVICE,
} from '~src/commons/http-interface/canister_http_interface_types';
import { streamContent } from '~src/commons/streaming';
import { NotAllowedRequestRedirectError } from '~src/errors/not-allowed-redirect-error';
import { DEFAULT_GATEWAY } from './static';
import {
  FetchAssetOptions,
  FetchAssetResult,
  HTTPHeaders,
  HTTPMethods,
  HttpResponse,
} from './typings';
import { logger } from '@dfinity/http-proxy-core';

export const maxCertTimeOffsetNs = BigInt.asUintN(64, BigInt(300_000_000_000));
export const cacheHeaders = [HTTPHeaders.CacheControl.toString()];

export async function createAgentAndActor(
  gatewayUrl: URL,
  canisterId: Principal,
  fetchRootKey: boolean
): Promise<[HttpAgent, ActorSubclass<_SERVICE>]> {
  const agent = new HttpAgent({ host: gatewayUrl.toString() });
  if (fetchRootKey) {
    await agent.fetchRootKey();
  }
  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: canisterId,
  });
  return [agent, actor];
}

/**
 * Fetch a requested asset and handles upgrade calls when required.
 *
 * @param canister Canister holding the asset
 * @returns Fetched asset
 */
export const fetchAsset = async ({
  actor,
  agent,
  canister,
  request,
  certificateVersion,
}: FetchAssetOptions): Promise<FetchAssetResult> => {
  try {
    const url = new URL(request.url);

    const requestHeaders: [string, string][] = [['Host', url.hostname]];
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'if-none-match') {
        // Drop the if-none-match header because we do not want a "304 not modified" response back.
        // See TT-30.
        return;
      }
      requestHeaders.push([key, value]);
    });

    // If the accept encoding isn't given, add it because we want to save bandwidth.
    if (!request.headers.has('Accept-Encoding')) {
      requestHeaders.push(['Accept-Encoding', 'gzip, deflate, identity']);
    }

    const httpRequest: HttpRequest = {
      method: request.method,
      url: url.pathname + url.search,
      headers: requestHeaders,
      body: new Uint8Array(await request.arrayBuffer()),
      certificate_version: [certificateVersion],
    };

    let httpResponse = await actor.http_request(httpRequest);
    const upgradeCall =
      httpResponse.upgrade.length === 1 && httpResponse.upgrade[0];
    const bodyEncoding =
      httpResponse.headers
        .filter(([key]) => key.toLowerCase() === HTTPHeaders.ContentEncoding)
        ?.map((header) => header[1].trim())
        .pop() ?? '';

    if (upgradeCall) {
      // repeat the request as an update call
      httpResponse = await actor.http_request_update(httpRequest);
    }

    // if we do streaming, body contains the first chunk
    let buffer = new ArrayBuffer(0);
    buffer = concat(buffer, httpResponse.body);
    if (httpResponse.streaming_strategy.length !== 0) {
      buffer = concat(
        buffer,
        await streamContent(agent, canister, httpResponse)
      );
    }
    const responseBody = new Uint8Array(buffer);

    return {
      ok: true,
      data: {
        updateCall: upgradeCall,
        request: {
          body: httpRequest.body,
          method: httpRequest.method,
          url: httpRequest.url,
          headers: httpRequest.headers.map(([key, value]) => [key, value]),
        },
        response: {
          encoding: bodyEncoding,
          body: responseBody,
          statusCode: httpResponse.status_code,
          headers: httpResponse.headers.map(([key, value]) => [key, value]),
        },
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e,
    };
  }
};

/**
 * Decode a body (ie. deflate or gunzip it) based on its content-encoding.
 * @param body The body to decode.
 * @param encoding Its content-encoding associated header.
 */
export function decodeBody(body: Uint8Array, encoding: string): Uint8Array {
  switch (encoding) {
    case 'identity':
    case '':
      return body;
    case 'gzip':
      return ungzip(body);
    case 'deflate':
      return inflate(body);
    default:
      throw new Error(`Unsupported encoding: "${encoding}"`);
  }
}

const fromResponseVerificationHeaders = (
  headers: [string, string][]
): Headers => {
  const finalHeaders = new Headers();
  headers.forEach(([key, value]) => {
    finalHeaders.append(key, value);
  });

  return finalHeaders;
};

const SW_UNINSTALL_SCRIPT = `
// Uninstalling the IC service worker in favor of the proxy.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  // uninstall itself & reload page
  self.registration
    .unregister()
    .then(function () {
      return self.clients.matchAll();
    })
    .then(function (clients) {
      clients.forEach((client) => {
        client.navigate(client.url);
      });
    });
});
`;

export const stringToIntArray = (body: string): Uint8Array => {
  const encoder = new TextEncoder();

  return encoder.encode(body);
};

export const processIcRequest = async (
  canister: Principal,
  request: Request,
  shouldFetchRootKey = false
): Promise<HttpResponse> => {
  const httpResponse = await fetchFromInternetComputer(
    canister,
    request,
    shouldFetchRootKey
  );

  const maybeUninstallServiceWorker = maybeUninstallHTTPGatewayServiceWorker(
    request,
    httpResponse
  );

  if (maybeUninstallServiceWorker) {
    return maybeUninstallServiceWorker;
  }

  return httpResponse;
};

export const maybeUninstallHTTPGatewayServiceWorker = (
  request: Request,
  icResponse: HttpResponse
): HttpResponse | null => {
  const serviceWorkerUpdateRequest = !!request.headers.get(
    HTTPHeaders.ServiceWorker
  );

  if (!serviceWorkerUpdateRequest) {
    return null;
  }

  const contentType =
    icResponse.headers.get(HTTPHeaders.ContentType)?.trim() ?? '';
  const hasOnChainSW =
    icResponse.status >= 200 &&
    icResponse.status <= 299 &&
    [
      'text/javascript',
      'application/javascript',
      'application/x-javascript',
    ].includes(contentType) &&
    !new TextDecoder()
      .decode(icResponse.body)
      .includes('registration.unregister()');

  // if the ic response contains a service worker we ignore the uninstall script
  if (hasOnChainSW) {
    return null;
  }

  return {
    status: 200,
    headers: new Headers({ [HTTPHeaders.ContentType]: 'text/javascript' }),
    body: stringToIntArray(SW_UNINSTALL_SCRIPT),
  };
};

export const fetchFromInternetComputer = async (
  canister: Principal,
  request: Request,
  shouldFetchRootKey = false
): Promise<HttpResponse> => {
  try {
    const minAllowedVerificationVersion = getMinVerificationVersion();
    const desiredVerificationVersion = getMaxVerificationVersion();

    const [agent, actor] = await createAgentAndActor(
      DEFAULT_GATEWAY,
      canister,
      shouldFetchRootKey
    );
    const result = await fetchAsset({
      agent,
      actor,
      request: request,
      canister,
      certificateVersion: desiredVerificationVersion,
    });

    if (!result.ok) {
      let errMessage = 'Failed to fetch response';
      if (result.error instanceof Error) {
        logger.error(`Failed to fetch asset response (${result.error})`);
        errMessage = result.error.message;
      }

      return {
        status: 500,
        headers: new Headers(),
        body: stringToIntArray(errMessage),
      };
    }

    const assetFetchResult = result.data;
    const responseHeaders = new Headers();
    for (const [key, value] of assetFetchResult.response.headers) {
      const headerKey = key.trim().toLowerCase();
      if (cacheHeaders.includes(headerKey)) {
        // cache headers are remove since those are handled by
        // cache storage within the service worker. If returned they would
        // reach https://www.chromium.org/blink/ in the cache of chromium which
        // could cache those entries in memory and those requests can't be
        // intercepted by the service worker
        continue;
      }

      responseHeaders.append(key, value);
    }

    // update calls are certified since they've went through consensus
    if (assetFetchResult.updateCall) {
      responseHeaders.delete(HTTPHeaders.ContentEncoding);
      const decodedResponseBody = decodeBody(
        assetFetchResult.response.body,
        assetFetchResult.response.encoding
      );

      return {
        status: assetFetchResult.response.statusCode,
        headers: responseHeaders,
        body: decodedResponseBody,
      };
    }

    const currentTimeNs = BigInt.asUintN(64, BigInt(Date.now() * 1_000_000)); // from ms to nanoseconds
    const assetCertification = verifyRequestResponsePair(
      {
        headers: assetFetchResult.request.headers,
        method: assetFetchResult.request.method,
        url: assetFetchResult.request.url,
      },
      {
        statusCode: assetFetchResult.response.statusCode,
        body: assetFetchResult.response.body,
        headers: assetFetchResult.response.headers,
      },
      canister.toUint8Array(),
      currentTimeNs,
      maxCertTimeOffsetNs,
      new Uint8Array(agent.rootKey),
      minAllowedVerificationVersion
    );

    if (assetCertification.passed && assetCertification.response) {
      const certifiedResponseHeaders = fromResponseVerificationHeaders(
        assetCertification.response.headers
      );

      certifiedResponseHeaders.forEach((headerValue, headerKey) => {
        responseHeaders.set(headerKey, headerValue);
      });

      responseHeaders.delete(HTTPHeaders.ContentEncoding);
      const decodedResponseBody = decodeBody(
        assetFetchResult.response.body,
        assetFetchResult.response.encoding
      );

      // Redirects are blocked for query calls that are not validating headers
      if (
        assetCertification.verificationVersion <= 1 &&
        assetFetchResult.response.statusCode >= 300 &&
        assetFetchResult.response.statusCode < 400
      ) {
        throw new NotAllowedRequestRedirectError();
      }

      return {
        status: assetCertification.response.statusCode ?? 200,
        headers: responseHeaders,
        body: decodedResponseBody,
      };
    }
  } catch (err) {
    logger.error(`ICRequest failed processing verification (${String(err)})`);
  }

  return {
    status: 500,
    headers: new Headers(),
    body: stringToIntArray('Body does not pass verification'),
  };
};

export const parseIncomingMessageHeaders = (
  rawHeaders: IncomingMessage['headers']
): Headers => {
  const requestHeaders = new Headers();
  Object.entries(rawHeaders).forEach(([headerName, rawValue]) => {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((headerValue) => {
        requestHeaders.append(headerName, headerValue);
      });
      return;
    }

    requestHeaders.append(headerName, rawValue ?? '');
  });

  return requestHeaders;
};

export const convertIncomingMessage = (
  incoming: IncomingMessage,
  processHeaders?: (headers: Headers) => Headers
): Promise<Request> => {
  const rawHeaders = parseIncomingMessageHeaders(incoming.headers);
  const urlPath = incoming.url ?? '';
  const hostname = rawHeaders.get('host') ?? '';
  const url = new URL(`https://${hostname}${urlPath}`);
  const method = (incoming.method ?? HTTPMethods.GET.toString()).toLowerCase();
  const canHaveBody = ![
    HTTPMethods.GET.toString().toLowerCase(),
    HTTPMethods.HEAD.toString().toLowerCase(),
  ].includes(method);
  const headers = processHeaders ? processHeaders(rawHeaders) : rawHeaders;

  return new Promise<Request>((ok) => {
    let requestBody = '';
    incoming.on('data', (chunk) => {
      requestBody += chunk;
    });
    incoming.on('end', () => {
      const request = new Request(url.href, {
        method,
        headers,
        body: canHaveBody ? requestBody : undefined,
      });

      ok(request);
    });
  });
};
