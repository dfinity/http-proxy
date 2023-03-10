import { resolve } from "path";
import { envConfigs } from "./commons";

export const ONLINE_DESCRIPTOR = resolve(envConfigs.dataPath, "proxy.pid");
