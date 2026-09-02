# 灵动 LingDrama

灵动（LingDrama）是一套面向 AI 短剧生产的全流程工作台，覆盖原始内容整理、剧本改写、角色与场景提取、分镜设计、图片与视频生成、配音、合成和整集导出。

界面默认使用中文，并可在页面顶部切换为 English。当前版本以稳定、易维护为优先，保留上游的主要交互结构，使用独立的 LingDrama 品牌、图标与文案。

## 功能概览

- AI 剧本改写与角色、场景提取
- 角色形象、场景图、镜头图与宫格图生成
- 分镜视频、TTS 配音、字幕与音视频合成
- 多家文本、图片、视频与音频服务商配置
- OpenAI 兼容 `/v1/videos` 异步视频任务、鉴权下载与原生音轨保留
- 中文 / English 界面切换
- SQLite 数据持久化与 Docker 单容器部署

## Docker 部署

环境要求：Docker 24+，建议至少 4 核 CPU、8 GB 内存，并预留足够的图片与视频存储空间。生产镜像使用 Node.js 22。

```bash
git clone https://github.com/yuanbuilds/lingdrama.git
cd lingdrama
docker build -t lingdrama:local .
mkdir -p data/static
docker run -d \
  --name lingdrama \
  --restart unless-stopped \
  -p 127.0.0.1:5679:5679 \
  -e NODE_ENV=production \
  -e PORT=5679 \
  -e DB_PATH=/app/data/lingdrama.db \
  -e STORAGE_PATH=/app/data/static \
  -v "$(pwd)/data:/app/data" \
  lingdrama:local
```

启动后可在服务器本机访问 `http://127.0.0.1:5679`，公网环境应再通过 HTTPS 反向代理开放。首次使用时，请在「设置 / Settings」中添加自己的 AI 服务地址、模型和 API Key。

生产环境建议将密钥挂载为只读文件，在设置里的 API Key 填写
`file:/run/secrets/lingdrama/provider_key`。配置接口只返回密钥是否存在，
不会回传原文；也支持 `env:VARIABLE_NAME` 引用环境变量。

```bash
docker run ... \
  -v "$(pwd)/secrets:/run/secrets/lingdrama:ro" \
lingdrama:local
```

全新数据库首次启动后，需要先创建管理员和工作区。准备一个权限为 `600`
且不进入版本库的 `secrets/showcase-users.json` 文件，例如：

```json
{
  "admin_password": "请替换为独立强密码",
  "client_password": "请替换为不同的独立强密码"
}
```

执行 `chmod 600 secrets/showcase-users.json` 后启动容器，再运行一次幂等初始化；
生产环境推荐为每个账号在 `passwords` 字段设置
不同密码：

```bash
docker exec lingdrama npm --prefix backend run seed:showcase
```

初始化脚本只将 scrypt 密码哈希写入数据库，不输出或保存明文密码。

也可以使用 Compose；默认同样只绑定服务器回环地址，公网仍需 HTTPS 反向代理：

```bash
docker compose up -d --build
```

健康检查：

```bash
curl http://127.0.0.1:5679/api/v1/health
```

## 本地开发

需要 Node.js 22、npm 10+ 和 FFmpeg。

```bash
# 后端
cd backend
npm install
npm run dev

# 另一个终端启动前端
cd frontend
npm install
npm run dev
```

前端开发地址为 `http://localhost:3013`，后端 API 为 `http://localhost:5679/api/v1`。

## 数据与升级

运行数据统一保存在 `data/`。升级或替换容器前请先备份该目录。

本仓库保留完整 Git 历史，并配置原始项目为 `upstream`。同步上游时建议先在独立分支完成合并和验证：

```bash
# 新克隆的工作区首次执行一次
git remote add upstream https://github.com/chatfire-AI/huobao-drama.git

git fetch upstream
git switch -c codex/sync-upstream
git merge upstream/master
```

解决冲突并完成构建、双语界面和部署验证后，再合并到 `master`。品牌与国际化改动集中在少量独立文件中，便于后续同步。

## 来源与授权提示

本项目基于 [chatfire-AI/huobao-drama](https://github.com/chatfire-AI/huobao-drama) 的 GitHub Fork 开发，Fork 关系与提交历史用于追溯来源和后续同步。

截至建立本 Fork 时，上游仓库根目录未提供独立的 `LICENSE` 文件。对外分发、商业授权或二次许可前，请另行确认上游代码的适用授权范围。
