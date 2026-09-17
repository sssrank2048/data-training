# 换环境运行与数据准备

## 为什么新环境没有数据

`data/private/` 由 Git 忽略，完整原始 CSV、派生明细和小组导出均不进入 `dist`。复制静态网页或拉取代码不会携带这些文件，需要在新环境准备数据。不要取消忽略规则或把数据拷入 `dist`。

主案例是 Berkeley Haas Rocket Fuel B5894。下载来自 OguzhanCetinkaya/rocketfuel 的公开镜像，固定提交为 `b2d2b779bd38dd7813623e25786d53fcb7012005`。这是可复核的镜像版本，未认证为出版方官方原件。

## 运行完整 Node 项目

需要 Node.js 20 或更高版本，复制或拉取完整项目的代码，包括 `scripts`、`dist` 和 `package.json`。在项目根目录执行：

```sh
npm start
```

启动前会检查 `data/private/rocketfuel_data.csv`。文件缺失时，从固定镜像下载到临时文件；只有长度与 SHA-256 同时通过才安装。已有匹配文件不重复下载，已有不匹配文件不会被覆盖。下载只依赖 Node，无需安装 curl、unzip 或 npm 包。路径按脚本所在项目定位，不依赖启动命令的工作目录。

首次下载最多等待 3 分钟。网络失败时仍启动网站供阅读问题、参考答案和导入数据，终端会显示错误和处理方法。打开 **http://127.0.0.1:4317/**，在“数据与原始明细”确认 **588,101 条记录 · 镜像已核验**。

如果需要预先准备好数据后才启动：

```sh
npm run data:download
npm run data:check
npm run data:inspect
npm run serve
```

`data:download` 为较慢网络保留最多 15 分钟下载时间；启动时的自动准备只等待 3 分钟。`data:check` 在缺失或不匹配时返回非零退出码；`data:inspect` 从完整 CSV 重算质量与实验结果，将审计输出保存在 `data/private`。自动化流水线应检查每条命令是否成功后再继续。离线环境可直接 `npm run serve`，从网页导入已经取得的案例 CSV；浏览器导入不会把文件写回项目目录。

服务仍只监听回环地址，不会自动开放公网端口或发布至 Sites。若从另一台电脑访问，需要由运行环境另行配置访问方式；本次修复没有改变监听地址。

## 只有 dist 静态文件

静态服务器没有 `/__local/rocketfuel_data.csv`，也不会执行 Node 数据下载脚本。打开“数据与原始明细”后选择：

1. **从公开镜像加载**：点击后浏览器直接请求下方固定 URL，核验完整长度与 SHA-256，再在 Web Worker 中计算。需允许访问 `raw.githubusercontent.com`；若配置了 CSP，`connect-src` 也需允许该域。
2. **导入案例 CSV**：通过“打开镜像原始 CSV”获取文件，将其保存到 `data/private`，再选择导入。手动导入保留质量检查；若与固定镜像不同，会标注差异并使原有证据需要重新核对。

镜像加载与手动导入仅在浏览器内存计算，不上传 CSV，不写入服务器目录。刷新页面后需要重新加载。小组草稿继续保存在浏览器本地存储。**静态模式的小组 JSON、报告与筛选明细导出仍需要配套 Node 服务**；完整上机功能请使用 Node 模式。

用 HTTPS 或本机 `localhost` / `127.0.0.1` 地址打开页面，以便浏览器使用文件指纹校验等安全 API。静态服务器需正确提供 `.mjs` 为 JavaScript，并从站点根目录提供本项目资源。

## 固定数据身份与排障

- 文件名：`rocketfuel_data.csv`
- 完整大小：12,024,311 字节（约 11.47 MiB）
- 记录数：588,101，另有 1 行表头，6 列
- SHA-256：`5e2325b50ed34283a38b011f12323609bbf6554236c17632c84cd3a6866097a2`
- [下载固定镜像原始 CSV](https://raw.githubusercontent.com/OguzhanCetinkaya/rocketfuel/b2d2b779bd38dd7813623e25786d53fcb7012005/rocketfuel_data.csv)

| 现象 | 处理 |
| --- | --- |
| Node 环境返回数据 404 | 执行 `npm run data:download`，然后 `npm run data:check`；回到网页点击“重新读取环境数据”。 |
| 只有静态文件，或数据端点返回 HTML 首页 | 使用镜像加载或文件导入；HTML 不会被当成 CSV。 |
| 无法访问镜像 / 下载超时 | 检查网络限制；也可在可访问镜像的环境获取 CSV，通过网页手动导入。 |
| 长度或指纹不匹配 | 保留并核对现有文件，将其重命名备份在 `data/private` 后重新下载；不拼接部分文件，不替换成自造数据。 |
| 没有文件写权限 | 确保项目 `data/private` 可写，或启动 `npm run serve` 后用浏览器导入。 |
| 容器重建后数据消失 | 在新容器准备数据，或将项目的 `data/private` 对应到运行环境的持久目录；不要把数据打包进静态资源。 |

Air France 旧案例独立准备：`npm run legacy:download` 后执行 `npm run legacy:inspect`。主案例自动下载不会混入旧案例数据。
