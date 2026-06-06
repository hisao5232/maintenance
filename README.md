# 整備記録システム

重機の整備記録を登録・検索するWebアプリ。

## 技術構成

- **フロントエンド**: Next.js / Cloudflare Pages
- **バックエンド**: Hono / Cloudflare Workers
- **データベース**: Cloudflare D1

## ディレクトリ構成
```
maintenance/
├── api/   # Hono Workers（バックエンドAPI）
└── web/   # Next.js（フロントエンド）
```

## ローカル開発

```bash
# APIサーバー起動（localhost:8787）
cd api
wrangler dev src/index.ts

# Webサーバー起動（localhost:3000）
cd web
npm run dev
```

## デプロイ

```bash
# API
cd api
wrangler deploy

# Web
cd web
npm run build
wrangler pages deploy
```
