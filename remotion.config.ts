import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/remotion/index.ts");
Config.setOutputLocation("out/trailer.mp4");
Config.setOverwriteOutput(true);
Config.setPublicDir("public");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(18);
