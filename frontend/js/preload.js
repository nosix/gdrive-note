import {CLIENT_ID} from "./properties.js"

const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'https://www.googleapis.com/discovery/v1/apis/people/v1/rest',
];
const SCOPES = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

let tokenClient;
let gsiEnabled = false;
let gapiEnabled = false;
let apiActivatedListener;

class Modal {
    constructor(selector, defaultShow) {
        this.modal = document.querySelector(selector);
        if (defaultShow) {
            this.show();
        }
    }

    show() {
        this.modal.classList.add('show-modal');
    }

    hide() {
        this.modal.classList.remove('show-modal');
    }
}

const modal = new Modal('.modal', true);

const authorize = document.getElementById('authorize');
authorize.disabled = true;
authorize.onclick = () => {
    // ログイン処理を行う
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        disableLogin();
        if (apiActivatedListener !== undefined) {
            apiActivatedListener(gapi.client);
        }
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({prompt: ''});
    }
};

const account = document.getElementById('account');
account.onclick = () => {
    // ログアウト処理を行う
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        enableLogin();
        if (apiActivatedListener !== undefined) {
            apiActivatedListener(null);
        }
    }
};

function gsiLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
    });
    gsiEnabled = true;
    maybeEnableButtons();
}

function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiEnabled = true;
        maybeEnableButtons();
    });
}

function maybeEnableButtons() {
    if (gsiEnabled && gapiEnabled) {
        enableLogin();
        authorize.disabled = false;
    }
}

function enableLogin() {
    authorize.innerText = 'ログイン';
    modal.show();
}

function disableLogin() {
    modal.hide();
}

function isApiActivated() {
    return gapi.client.getToken() !== null;
}

function setOnApiActivated(listener) {
    apiActivatedListener = listener;
    if (isApiActivated()) {
        apiActivatedListener(gapi.client);
    }
}

window.gsiLoaded = gsiLoaded;
window.gapiLoaded = gapiLoaded;
window.setOnApiActivated = setOnApiActivated;
