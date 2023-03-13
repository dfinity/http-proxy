import { exec } from "child_process";

export const execAsync = async (command: string): Promise<string> => {
    return new Promise<string>((ok, err) => {
        exec(command, (error, stdout) => {
            if (error) {
              return err(error);
            }

            ok(stdout);
        })
    })
}
