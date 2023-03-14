import {CLIENT_ID} from "./properties"

const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const SCOPES = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
].join(' ');

const authButton = document.getElementById('authorize');
authButton.disabled = true;

let tokenClient;
let gsiEnabled = false;
let gapiEnabled = false;
let apiActivatedListener;

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
        authButton.disabled = false;
    }
}

function enableLogin() {
    authButton.onclick = () => {
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
    authButton.innerText = 'ログイン';
    authButton.className = 'toggle-secondary-button-off';
}

function disableLogin() {
    authButton.onclick = () => {
        // ログアウト処理を行う
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            enableLogin();
        }
    };
    authButton.innerText = 'ログアウト';
    authButton.className = 'toggle-secondary-button-on';
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
