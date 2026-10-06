# 兼容性测试

使用 Node.js 22.19 或仓库 CI 的 Node.js 24：

```sh
npm ci
npm test
```

`npm test` 先构建 TypeScript，再使用实际安装的 PicGo Core 运行 6 项测试：插件加载与 GUI 配置、完整 PNG 上传流程、GUI 删除事件、无效配置、非法文件名以及上传错误通知。测试使用临时配置，模拟 S3 传输，不需要 R2 密钥，也不会上传或删除云端对象。

开发依赖声明为 `picgo: ^1.6.6`，锁文件固定本次验证的 1.6.6。PicGo 桌面版与 PicGo Core 的版本号不同：[桌面版 v3.0.3](https://github.com/Molunerfinn/PicGo/tree/v3.0.3) 的锁文件使用 Core 3.1.0。可在不改变仓库依赖的情况下复现该版本的兼容性检查（在仓库根目录运行）：

```sh
compat_dir=$(mktemp -d)
npm install --prefix "$compat_dir" --save-exact picgo@3.1.0
npm run build
PICGO_COMPAT_MODULE="$compat_dir/node_modules/picgo" node --test test/*.test.cjs
```

这验证了插件与桌面版所用 Core 的接口兼容性，未覆盖 Electron GUI 操作、剪贴板或真实 R2 请求。

现有 ESLint 解析器 `@typescript-eslint` 5.x 声明支持 TypeScript `<5.2`。本次源码 lint 检查通过，但其对 TypeScript 5.9 的正式支持仍需单独升级 ESLint 配置及相关插件。
