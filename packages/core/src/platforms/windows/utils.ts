import { exec } from 'child_process';

export const POWERSHELL_ESCAPED_QUOTES = '\\`"';

export const escapeString = (argument: string): string => {
  return POWERSHELL_ESCAPED_QUOTES + argument + POWERSHELL_ESCAPED_QUOTES;
};

export const isTrustedCertificate = async (
  certificateId: string
): Promise<boolean> => {
  return new Promise<boolean>((ok) => {
    exec(`certutil -verifystore root ${certificateId}`, (error) => {
      ok(error ? false : true);
    });
  });
};
