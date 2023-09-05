import { execAsync } from "@dfinity/http-proxy-core";

export const BASE_SNAP_MOZZILA_PATH = "snap/firefox/common/.mozilla";
export const BASE_MOZILLA_PATH = ".mozilla";
export const MOZILLA_CERTIFICATES_FOLDER = "certificates";
export const FIREFOX_PROFILES_FOLDER = `firefox`;
export const ROOT_CA_STORE_PATH = "/usr/local/share/ca-certificates";
export const ROOT_CA_PATH = `${ROOT_CA_STORE_PATH}/ic-http-proxy-root-ca.crt`;
export const CURL_RC_FILE = '.curlrc';

export const findP11KitTrustPath = async (): Promise<string | null> => {
    const path = await execAsync("sudo find /usr -name p11-kit-trust.so");

    return path.length ? path : null;
}
