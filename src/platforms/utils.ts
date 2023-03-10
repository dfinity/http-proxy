import { exec } from "child_process";

export const execAsync = async (command: string): Promise<void> => {
    return new Promise<void>((ok, err) => {
        exec(command, (error) => {
            if (error) {
              return err(error);
            }

            ok();
        })
    })
}
