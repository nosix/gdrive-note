export function listenIdToken(callback) {
    window.addEventListener('idToken', () => {
        const idToken = sessionStorage.getItem('idToken');
        console.debug(`Web:idToken:${idToken}`);
        callback(idToken);
    });
    if (sessionStorage.getItem('idToken')) {
        window.dispatchEvent(new CustomEvent('idToken'));
    }
}