import { exec } from "child_process";

export const POWERSHELL_ESCAPED_QUOTES = '\\`"';

export const escapeString = (argument: string): string => {
    const escapedParts = argument.split("\\").filter((part) => part.length > 0);
    const escaped = escapedParts.join("\\\\");

    return POWERSHELL_ESCAPED_QUOTES + argument + POWERSHELL_ESCAPED_QUOTES;
}

export const isTrustedCertificate = async (certificateId: string): Promise<boolean> => {
    return new Promise<boolean>((ok, err) => {
        exec(
        `certutil -verifystore root ${certificateId}`,
            (error) => {
                    ok(error ? false : true);
            }
        );
    });
}
