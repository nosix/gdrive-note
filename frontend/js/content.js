export class Content {

    static create(tokenInfo, state, callback) {
        if (window.content) {
            callback(new Content(new ContentOnAndroid(window.content)));
        } else {
            ContentOnWeb.create(tokenInfo, state, (impl) => {
                callback(new Content(impl));
            });
        }
    }

    constructor(impl) {
        this.__impl = impl;
    }

    async create() {
        await this.__impl.create();
    }

    async loadText() {
        return await this.__impl.loadText();
    }

    async saveText(text) {
        await this.__impl.saveText(text);
    }
}

async function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

class ContentOnWeb {

    static SCOPES = [
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.file',
    ].join(' ');

    static DISCOVERY_DOCS = [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    ];

    static create(tokenInfo, state, callback) {
        (async () => {
            await loadScript('https://apis.google.com/js/api.js');
            gapi.load('client', async () => {
                await gapi.client.init({
                    discoveryDocs: ContentOnWeb.DISCOVERY_DOCS,
                });
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: tokenInfo.clientId(),
                    scope: ContentOnWeb.SCOPES,
                    prompt: '',
                    hint: tokenInfo.email(),
                    callback: (tokenResponse) => {
                        console.debug(tokenResponse);
                        callback(new ContentOnWeb(state, gapi.client, tokenResponse.access_token));
                    },
                });
                tokenClient.requestAccessToken();
            });
        })();
    }

    constructor(state, client, accessToken) {
        this.__state = state;
        this.__client = client;
        this.__accessToken = accessToken;
        this.__fileId = null;
    }

    async create() {
        try {
            const response = await this.__client.request({
                path: '/drive/v3/files',
                method: 'POST',
                body: {
                    name: 'NewFile.md',
                    mimeType: 'text/markdown',
                    parents: [this.__state.folderId()],
                }
            });
            console.debug(response);
            this.__fileId = response.result.id;
        } catch (e) {
            console.error(e.message);
        }
    }

    async loadText() {
        const fileId = this.__state.fileId();
        if (fileId === null) {
            console.error('Cannot open the file because fileId is missing.');
            return;
        }

        try {
            const response = await this.__client.request({
                path: `/drive/v3/files/${fileId}`,
                method: 'GET',
                params: {
                    alt: 'media'
                }
            });
            console.debug(response);
            this.__fileId = fileId;
            return response.body;
        } catch (e) {
            console.error(e.message);
            return null;
        }
    }

    async saveText(text) {
        if (this.__fileId === null) {
            return;
        }

        try {
            const response = await this.__client.request({
                path: `/upload/drive/v3/files/${this.__fileId}`,
                method: 'PATCH',
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Length': new TextEncoder().encode(text).length,
                },
                body: text,
            });
            console.debug(response);
            this.__fileId = response.result.id;
        } catch (e) {
            console.error(e.message);
        }
    }
}

class ContentOnAndroid {

    constructor(content) {
        this.__content = content;
    }

    async loadText() {
        return this.__content.loadText();
    }

    async saveText(text) {
        this.__content.saveText(text);
    }
}