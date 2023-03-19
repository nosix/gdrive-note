# Google Drive Note

## 環境構築

### サーバー構築

Google Cloud で以下を行える様にする。

- Drive API, People API の使用
- ドライブアプリとしての起動
- Workspace Marketplace からのアプリインストール
- Cloud Functions での backend 実行
- GitHub Actions からの backend のデプロイ

GitHub で以下を行える様にする。

- Cloud Functions への backend のデプロイ
- GitHub Pages への frontend のデプロイ

以下が構築手順になる。

1. Google Cloud にプロジェクトを作成
2. API とサービス
   1. 有効な API とサービス
      - People API を有効化
      - Google Drive API を有効化
         1. [ドライブ UI の統合](https://developers.google.com/drive/api/guides/enable-sdk?hl=ja)を開く
            1. アプリケーションアイコンを設定
            2. 認証を設定
               - オープン URL を設定
               - Default MIME Types: `text/markdown`
               - Default MIME Extensions: `md`
            3. ファイルの作成を設定
               - このアプリケーションを使用して新しい...: 有効
               - 新規作成 URL: オープン URL
      - [Google Workspace Marketplace SDK](https://developers.google.com/workspace/marketplace/enable-configure-sdk?hl=ja)
         1. アプリの構成を設定
            - アプリの公開設定: 限定公開
            - アプリの統合: ドライブアプリを有効化
            - OAuth スコープ: `https://www.googleapis.com/auth/drive.install` を追加
         2. ストアの掲載情報を設定
            - 必要項目を設定して公開
      - Cloud Functions API を有効化
   2. 認証情報
      1. OAuth 2.0 クライアント ID を追加
         1. 承認済みの JavaScript 生成元: オープン URL
      2. サービスアカウントを追加 (Cloud Functions Deploy 用アカウント)
         1. `<name>@<project-name>.iam.gserviceaccount.com` というアカウントを追加
   3. OAuth 同意画面
      1. ユーザーの種類: 内部 (推奨)
      2. スコープを追加
         - `.../auth/drive.appdata`
         - `.../auth/drive.file`
         - `.../auth/userinfo.profile`
3. IAM と管理
   1. IAM を設定
      1. Deploy 用サービスアカウントを編集
         - 「[Cloud Functions 管理者](https://cloud.google.com/iam/docs/understanding-roles?hl=ja#cloudfunctions.admin)」ロールを追加
         - 「[サービス アカウント ユーザー](https://cloud.google.com/iam/docs/understanding-roles?hl=ja#iam.serviceAccountUser)」ロールを追加
   2. [Workload Identity 連携](https://github.com/google-github-actions/auth#setting-up-workload-identity-federation)を設定
      1. プールを作成
      2. プールにプロバイダを追加する
         - プロバイダの選択: OpenID Connect (OIDC)
         - 発行元(URL): `https://token.actions.githubusercontent.com`
      3. 属性のマッピングを追加する
         - google.subject : assertion.sub
         - attribute.actor : assertion.actor
         - attribute.repository : assertion.repository
   3. サービスアカウントを設定
      1. Deploy 用サービスアカウントを編集
      2. 権限を開き、アクセスを許可
         - プリンシパルの追加: Workload Identity 連携で作成したプールの IAM プリンシパル
         - ロール: [Workload Identity ユーザー](https://cloud.google.com/iam/docs/understanding-roles?hl=ja#iam.workloadIdentityUser)
4. GitHub にリポジトリ作成
5. リポジトリの settings から Secrets and variables の Actions を開く
   1. Repository secrets に追加
      - CLIENT_ID: OAuth 2.0 クライアント ID
      - GPT_KEY: OpenAI API キー
      - ORIGIN: オープン URL のオリジン (CORS で許可するオリジン)
      - [SERVICE_ACCOUNT](https://github.com/google-github-actions/auth#inputs): Deploy 用サービスアカウントのメール
      - [WORKLOAD_IDENTITY_PROVIDER](https://github.com/google-github-actions/auth#inputs): `projects/<プロジェクト番号>/locations/global/workloadIdentityPools/<プール名>/providers/<プロバイダ名>`
   2. Repository variables に追加
      - WITH_AUTH: true (Cloud Functions の関数内で認証を行う)
6. リポジトリに push
   1. Actions workflow の成功を確認
     - [Cloud Functions に backend がデプロイされる](https://github.com/google-github-actions/deploy-cloud-functions)
     - GitHub Pages に frontend がデプロイされる
7. Cloud Functions を開く
   1. デプロイされた関数を開き、権限を開く
   2. [アクセス権を付与](https://cloud.google.com/functions/docs/writing/write-http-functions?hl=ja#cors-limitations)
      - プリンシパル: allUsers
      - ロール: [Cloud Functions 起動元](https://cloud.google.com/iam/docs/understanding-roles?hl=ja#cloudfunctions.invoker)

#### 参考

- [権限に対応するロール](https://cloud.google.com/iam/docs/permissions-reference)

### ローカルテスト環境

#### 設定

`backend` フォルダに `.env` ファイルを配置して以下を記述する。

```properties
CLIENT_ID=""
GPT_KEY=""
ORIGIN="http://localhost:1234"
WITH_AUTH=true
```

プロジェクトルートに `.env` ファイルを配置して以下を記述する。

```properties
CLIENT_ID=""
GPT_FUNCTION_URL="http://localhost:8080"
```

`.env` ファイルを配置せずに環境変数として設定しても構わない。

#### 実行

backend を起動:

```shell
$ npm run backend
```

frontend を起動:

```shell
$ npm run frontend
```

ブラウザでページを表示する際に state パラメータが必要。
state パラメータの値は以下を含んだ JSON 形式の値。
ID は Google Drive で使われる ID。

ファイルの新規作成の場合

- action: create
- folderId: ファイルを配置するフォルダの ID

既存ファイルの編集の場合

- action: open
- ids: ファイルの ID のリスト (要素数 1 で構わない)

## TODO

- [ ] FIXME 非表示行(コメント)があるため、プレビュー位置が大きくずれる
