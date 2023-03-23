import {CLIENT_ID} from './properties.js'

const gIdOnload = document.getElementById('g_id_onload');
gIdOnload.setAttribute('data-client_id', CLIENT_ID);
gIdOnload.setAttribute('data-callback', 'onAuthenticated');

async function onAuthenticated(token) {
    console.debug(token);
    sessionStorage.setItem('idToken', token.credential);
}

window.onAuthenticated = onAuthenticated;
