// 圖檔、字型用 import 引入（Remotion 的 webpack 會打包成網址字串）
declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.woff2" {
  const url: string;
  export default url;
}
