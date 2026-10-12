import { Config } from "@remotion/cli/config";

// Three.js（WebGL）在無頭 Chrome 裡需要 GPU 後端；Windows 用 angle
Config.setChromiumOpenGlRenderer("angle");
