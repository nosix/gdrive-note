import {CLIENT_ID} from './properties.js'

const isAndroid = !!window.content;

if (isAndroid) {
    function authenticateOnAndroid() {
        sessionStorage.removeItem('idToken');
        window.content.authenticate();
    }

    function onAndroidAuthenticated() {
        const idToken = window.content.getIdToken();
        console.debug(idToken);
        sessionStorage.setItem('idToken', idToken);
        window.dispatchEvent(new CustomEvent('idToken'));
    }

    // 再認証する際に呼び出す
    window.authenticate = authenticateOnAndroid;
    // 認証が完了したら、AndroidからonAuthenticatedを呼び出す
    window.onAuthenticated = onAndroidAuthenticated;
} else {
    let lastAuthenticatedTime = Date.now();

    function authenticateOnWeb() {
        const now = Date.now();
        sessionStorage.removeItem('idToken');
        google.accounts.id.initialize({
            client_id: CLIENT_ID,
            auto_select: (now - lastAuthenticatedTime) > 60 * 1000, // 1分を超えていれば自動選択
            callback: onAuthenticated
        });
        lastAuthenticatedTime = now;
        google.accounts.id.prompt();
    }

    async function onWebAuthenticated(token) {
        console.debug(token);
        sessionStorage.setItem('idToken', token.credential);
        window.dispatchEvent(new CustomEvent('idToken'));
    }

    window.authenticate = authenticateOnWeb;
    window.onAuthenticated = onWebAuthenticated;

    const gIdOnload = document.getElementById('g_id_onload');
    if (sessionStorage.getItem('idToken')) {
        gIdOnload.remove();
    } else {
        gIdOnload.setAttribute('data-client_id', CLIENT_ID);
        gIdOnload.setAttribute('data-callback', 'onAuthenticated');
    }
}
