import { execSync } from 'child_process';

export const SHELL_SCRIPT_SEPARATOR = ' ; ';
export const CURL_RC_FILE = '.curlrc';
export const PROXY_GET_SEPARATOR = ':ic-separator:';

export const getActiveNetworkService = (): string | null => {
  const networkServices = execSync(
    `networksetup -listallnetworkservices | tail -n +2`
  )
    .toString()
    .split('\n');
  for (const networkService of networkServices) {
    const assignedIpAddress = execSync(
      `networksetup -getinfo "${networkService}" | awk '/^IP address:/{print $3}'`
    )
      .toString()
      .trim();
    if (assignedIpAddress.length > 0) {
      return networkService;
    }
  }

  return null;
};
