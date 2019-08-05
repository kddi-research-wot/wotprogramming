## WoTプログラミング環境について
WoTプログラミング環境はブラウザ上でリアルタイムにソースコードを編集・実行し、URLを共有している全員が共同でアプリケーションを開発することができる開発環境です。センサーやアクチュエーターなどの物理デバイスをWebブラウザ技術だけで制御することができる開発環境[CHIRIMEN](https://chirimen.org/)と組み合わせることで、IoT/WoTアプリケーションを簡単に開発することができます。

## インストール方法

### 1.必要なソフトウェアのインストール
MySQLとnode.js及びnpmを使用していますので、それらのインストールが必要です。

### 2.レポジトリのクローン  
WoTプログラミング環境のレポジトリをクローンします。  
```
git clone https://github.com/kddi-research-wot/wotprogramming.git
```  
### 3.MySQLサーバのデータベースの作成
MySQLサーバにWoTプログラミング環境で使用するデータベースを作成します。
```
# MySQLサーバにログイン    
$ mysql -u root -p
# WoTプログラミング環境で使用するデータベースを作成します。
# 下記の例ではデータベース名wotpro_databaseとなります。
mysql> CREATE DATABASE wotpro_database;
# WoTプログラミング環境で使用するデータベースのユーザを作成します。
# 下記の例はユーザ名wotpro、パスワードuser_passwordとなります。
mysql> CREATE USER wotpro IDENTIFIED BY "user_password";
# データベースへの接続権限をユーザに与えます。
# 下記の例ではユーザwotproにデータベースwotpro_databaseへの接続権限を与えます。
mysql> GRANT ALL PRIVILEGES ON wotpro_database.* TO wotpro IDENTIFIED BY "user_password";
```
次にwotproデータベースの初期化プログラムを実行します。クローンしたレポジトリのディレクトリに移動し、下記のコマンドを実行します。
```
$ mysql -u wotpro -p"user_password" wotpro_database < build/db.sql
$ mysql -u wotpro -p"user_password" wotpro_database < build/template.sql
```

### 4.github OAuth設定
WoTプログラミング環境のユーザ認証にはgithubを使用しています。そのため、githubアカウントを取得し、OAuthアプリケーションの設定を行う必要があります。githubアカウントの`Settings`から`OAuth apprications`を選択し、`Register a new application`からWoTプログラミング環境のアプリケーション設定を行い、CLIENT_IDおよびCLIENT_SECRETを取得してください。

Authorization callback URLに`http://<WoTプログラミング環境のドメイン>:3200/auth/github/callback`と記入してください。localhostでサービスを立ち上げる場合、以下のようになります。
```
http://localhost:3200/auth/github/callback
```

### 5.config.jsonファイルの設定
config.jsonを書き換えサーバの設定します。これまで設定したgithub、mysqlの設定を以下のようにconfig.jsonファイルに記入します。`SERVER_URL`、`CALLBACK_URL`、`host`には、WoTプログラミング環境を立ち上げるドメインによって書き換えてください。以下では、localhostでサービスを立ち上げる例を示しています。
```
{
    "SERVER_URL" : "localhost:3200",
    "GITHUB" : {
        "CLIENT_ID" : "xxxxxxxxxxxxxxxxxxx",
        "CLIENT_SECRET" : "yyyyyyyyyyyyyyyyyyyyy"
    },        
    "MYSQL" : {
        "host": "localhost",
        "user": "wotpro",
        "password": "user_password",
        "database": "wotpro_database"
    }
}
```
### 6.サーバとクライアントの起動
WoTプログラミング環境のサーバとクライアントを実行します。レポジトリのディレクトリで下記のコマンドを実行します。
```
# サーバ起動に必要なモジュールのインストールをします。
$ npm install
# サーバを起動します。
$ node lib/app.js
```
localhostでサービスを立ち上げている場合、ウェブブラウザを起動し、アドレスバーに`http://localhost:3200`と入力し、クライアントを起動させます。
チューター画面には`http://localhost:3200/tutor`と入力する事でアクセス可能です。

## WoTプログラミング環境の使いかた
WoTプログラミング環境の使い方に関しては[ドキュメント](./docs/usage.md)に記載しておりますので、ご覧ください。

## 試験運用サイト
WoTプログラミング環境の使い方を手軽に試せるように試験運用サイトを用意しております。
### 注意事項
* 入力されたデータは個別のURLに紐付き保管されます。他者に見られる可能性がありますので、秘密情報や個人情報などは入力しないことをお勧めします。
* 本サイトは試験運用となります。予告なくサービスを停止、またはデータの削除を行う可能性があります。重要なデータはバックアップを取るようお願いいたします。本格的な開発プロジェクト等への利用を検討される場合、個別に環境構築を行うことをお勧めします。
* 試験運用サイトは2019年8月31日を目処に運用を停止させて頂きます。

試験運用サイトは[こちら](https://wotprogramming.org/)からどうぞお試しください。※2019年8月31日を目処に運用を停止させて頂きます。
