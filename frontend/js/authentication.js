import {CLIENT_ID} from './properties.js'

const isAndroid = !!window.content;

if (!isAndroid) {
    const gIdOnload = document.getElementById('g_id_onload');

    if (sessionStorage.getItem('idToken')) {
        gIdOnload.remove();
    } else {
        gIdOnload.setAttribute('data-client_id', CLIENT_ID);
        gIdOnload.setAttribute('data-callback', 'onAuthenticated');

        async function onAuthenticated(token) {
            console.debug(token);
            sessionStorage.setItem('idToken', token.credential);
            window.dispatchEvent(new CustomEvent('idToken'));
        }

        window.onAuthenticated = onAuthenticated;
    }
}
