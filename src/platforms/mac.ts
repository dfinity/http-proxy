import { exec } from "child_process";

const SHELL_SCRIPT_SEPARATOR = " ; ";

export class MacPlatform {
  public static async isTrustedCertificate(
    certificatePath: string
  ): Promise<boolean> {
    return new Promise<boolean>((ok, err) => {
      exec(
        `security verify-cert -k /Library/Keychains/System.keychain -c ${certificatePath}`,
        (error) => {
          ok(error ? false : true);
        }
      );
    });
  }

  public static async trustCertificate(certificatePath: string): Promise<void> {
    const isTrusted = await MacPlatform.isTrustedCertificate(certificatePath);
    if (isTrusted) {
      return;
    }
    return new Promise<void>((ok, err) => {
      const shellScript =
        "security authorizationdb write com.apple.trust-settings.admin allow" +
        SHELL_SCRIPT_SEPARATOR +
        `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certificatePath}` +
        SHELL_SCRIPT_SEPARATOR +
        "security authorizationdb remove com.apple.trust-settings.admin";
      exec(
        `osascript -e 'do shell script "${shellScript}" with prompt "IC HTTP Proxy wants to store SSL certification to keychain." with administrator privileges'`,
        (error) => {
          if (error) {
            return err(error);
          }

          ok();
        }
      );
    });
  }
}
