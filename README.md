# 灵动 LingDrama

灵动（LingDrama）是一套面向 AI 短剧生产的全流程工作台，覆盖原始内容整理、剧本改写、角色与场景提取、分镜设计、图片与视频生成、配音、合成和整集导出。

界面默认使用中文，并可在页面顶部切换为 English。当前版本以稳定、易维护为优先，保留上游的主要交互结构，使用独立的 LingDrama 品牌、图标与文案。

## 功能概览

- AI 剧本改写与角色、场景提取
- 角色形象、场景图、镜头图与宫格图生成
- 分镜视频、TTS 配音、字幕与音视频合成
- 多家文本、图片、视频与音频服务商配置
- 中文 / English 界面切换
- SQLite 数据持久化与 Docker 单容器部署

## Docker 部署

环境要求：Docker 24+，建议至少 4 核 CPU、8 GB 内存，并预留足够的图片与视频存储空间。

```bash
git clone https://github.com/yuanbuilds/lingdrama.git
cd lingdrama
docker build -t lingdrama:local .
mkdir -p data/static
docker run -d \
  --name lingdrama \
  --restart unless-stopped \
  -p 5679:5679 \
  -e NODE_ENV=production \
  -e PORT=5679 \
  -e DB_PATH=/app/data/lingdrama.db \
  -e STORAGE_PATH=/app/data/static \
  -v "$(pwd)/data:/app/data" \
  lingdrama:local
```

启动后访问 `http://服务器地址:5679`。首次使用时，请在「设置 / Settings」中添加自己的 AI 服务地址、模型和 API Key。

也可以使用 Compose：

```bash
docker compose up -d --build
```

健康检查：

```bash
curl http://127.0.0.1:5679/api/v1/health
```

## 本地开发

需要 Node.js 20+、npm 9+ 和 FFmpeg。

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
git fetch upstream
git switch -c codex/sync-upstream
git merge upstream/master
```

解决冲突并完成构建、双语界面和部署验证后，再合并到 `master`。品牌与国际化改动集中在少量独立文件中，便于后续同步。

## 来源与授权提示

本项目基于 [chatfire-AI/huobao-drama](https://github.com/chatfire-AI/huobao-drama) 的 GitHub Fork 开发，Fork 关系与提交历史用于追溯来源和后续同步。

截至建立本 Fork 时，上游仓库根目录未提供独立的 `LICENSE` 文件。对外分发、商业授权或二次许可前，请另行确认上游代码的适用授权范围。
