export function listenIdToken(callback) {
    if (window.content) {
        const idToken = window.content.getIdToken();
        console.debug(`Android:idToken:${idToken}`);
        callback(idToken);
    } else {
        window.addEventListener('idToken', () => {
            const idToken = sessionStorage.getItem('idToken');
            console.debug(`Web:idToken:${idToken}`);
            callback(idToken);
        });
        if (sessionStorage.getItem('idToken')) {
            window.dispatchEvent(new CustomEvent('idToken'));
        }
    }
}