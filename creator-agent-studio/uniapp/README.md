# 随行录 uni-app

## Supabase 配置

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `../supabase/schema.sql`。
3. 复制 `.env.example` 为 `.env`，填写 Project URL 与 Publishable/anon key。
4. 运行 `npm install`。
5. H5：`npm run dev:h5`。
6. 微信小程序：`npm run build:mp-weixin`，用微信开发者工具打开 `dist/build/mp-weixin`。

微信小程序上线前还需在 `src/manifest.json` 填写 AppID，并在微信后台配置 Supabase 域名白名单。
