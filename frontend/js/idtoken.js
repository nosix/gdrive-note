export function listenIdToken(callback) {
    const idToken = sessionStorage.getItem('idToken');
    if (idToken) {
        callback(idToken);
    } else {
        window.addEventListener('storage', (event) => {
            if (event.storageArea === sessionStorage && event.key === 'idToken') {
                callback(sessionStorage.getItem('idToken'));
            }
        });
    }
}