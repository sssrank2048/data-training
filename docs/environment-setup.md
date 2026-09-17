# 换环境运行与数据准备

## 为什么新环境没有数据

`data/private/` 由 Git 忽略，完整原始 CSV、派生明细和小组导出均不进入 `dist`。复制静态网页或拉取代码不会携带这些文件，需要在新环境准备数据。不要取消忽略规则或把数据拷入 `dist`。

主案例是 Berkeley Haas Rocket Fuel B5894。下载来自 OguzhanCetinkaya/rocketfuel 的公开镜像，固定提交为 `b2d2b779bd38dd7813623e25786d53fcb7012005`。这是可复核的镜像版本，未认证为出版方官方原件。

## 运行完整 Node 项目

需要 Node.js 20 或更高版本，复制或拉取完整项目的代码，包括 `scripts`、`dist` 和 `package.json`。在项目根目录执行：

```sh
npm start
```

启动前会检查 `data/private/rocketfuel_data.csv`。文件缺失时，从固定镜像下载到临时文件；只有长度与 SHA-256 同时通过才安装。已有匹配文件不重复下载，已有不匹配文件不会被覆盖。直连只依赖 Node；代理模式需要系统 curl，无需 unzip 或额外 npm 包。路径按脚本所在项目定位，不依赖启动命令的工作目录。

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

## 代理环境与 fetch failed

旧版下载器直接调用 Node `fetch`，未显式接入代理。`fetch failed` 只是通用连接错误，也可能涉及 DNS 或证书。Node 的代理支持与版本、启用选项有关；只设置 npm registry 代理或系统 / 浏览器代理，不能保证脚本的 fetch 使用同一路径。[Node 官方代理选项](https://nodejs.org/api/cli.html#node_use_env_proxy1)

更新后的主案例下载器会读取代理变量，选择 curl 处理代理连接，不要求升级 Node 20。已有完整文件仍会直接复用，无需联网。先执行 `curl --version` 确认程序存在；缺少时安装 curl 并加入 PATH，或使用网页文件导入。

按用户要求，主案例 npm 下载器默认跳过 HTTPS 服务器和 HTTPS 代理的证书校验，无需再配置 CA 文件或设置额外环境变量。代理请求使用 curl 的 `--insecure --proxy-insecure`，直连请求使用独立 Node 请求的 `rejectUnauthorized: false`，未修改全局 `NODE_TLS_REJECT_UNAUTHORIZED`。文件长度和固定 SHA-256 仍必须匹配；下载连接不再验证服务器证书身份。此修改不改变浏览器及独立保留的旧案例下载器。

主案例使用 HTTPS，配置优先级如下：

1. `COURSE_DATA_PROXY`：仅为课程下载显式指定代理，优先于已有变量。
2. `https_proxy`，然后 `HTTPS_PROXY`。
3. `all_proxy`，然后 `ALL_PROXY`。

`HTTP_PROXY` / `http_proxy` 只对应 HTTP 目标，不会单独用于主案例的 HTTPS 地址。`no_proxy` 优先于 `NO_PROXY`，命中的目标绕过代理；即使设置 `COURSE_DATA_PROXY` 也遵守此规则。curl 的 HTTP、HTTPS、SOCKS 支持与绕过规则见[curl 官方文档](https://curl.se/docs/manpage.html)。代理地址和凭据不会写入下载日志或子进程命令参数。

macOS / Linux，使用 HTTP 代理（以下地址和 7890 端口仅为示例，务必替换为实际值）：

```sh
COURSE_DATA_PROXY="http://127.0.0.1:7890" npm run data:download
npm run data:check
npm start
```

访问 HTTPS 镜像时，HTTP 代理地址仍通常以 `http://` 开头，通过 CONNECT 隧道建立连接；只有代理服务自身启用 TLS 时才填写 `https://`。

如果已正确设置终端的 `HTTPS_PROXY` / `ALL_PROXY`，直接重新运行 `npm run data:download` 即可。若使用 SOCKS5，使用实际 SOCKS 端口，并建议通过 `socks5h` 让代理解析镜像域名：

```sh
COURSE_DATA_PROXY="socks5h://127.0.0.1:7891" npm run data:download
```

Windows PowerShell（示例端口同样需要替换）：

```powershell
$env:COURSE_DATA_PROXY = "http://127.0.0.1:7890"
npm run data:download
npm run data:check
npm start
```

只打开代理客户端的“系统代理”或填写 PAC 地址时，请从客户端取得实际 HTTP / SOCKS 监听地址再传给命令。在容器或远程主机执行 npm 时，`127.0.0.1` 指的是该容器或主机，需使用它能够访问的代理地址。

| 提示 | 处理 |
| --- | --- |
| 未检测到下载代理环境变量 | 在执行 npm 的同一终端设置上述变量；无需分享账号或密码。 |
| 找不到 curl | 安装 curl 并加入 PATH；不会悄悄改为直连绕过代理。 |
| 无法连接代理或目标地址 | 检查代理是否启动、协议和端口、容器 / 主机之间的可达性。 |
| HTTP 407 | 检查代理认证配置。反馈报错时不要贴代理密码。 |
| 域名解析失败 | SOCKS 场景可用 `socks5h://` 让代理解析；确认代理规则允许镜像域名。 |
| TLS 连接失败 | 本下载器已跳过证书校验；仍失败时请核对代理协议、端口、握手兼容性及代理是否要求客户端证书。 |
| 镜像 HTTP 403 / 其他拒绝 | 检查代理对 `raw.githubusercontent.com` 的访问规则。 |

“从公开镜像加载”按钮走浏览器自身网络设置，终端代理变量只影响 Node 下载脚本。终端下载成功后，在网页点击“重新读取环境数据”，无需继续依赖浏览器访问外部镜像。

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
