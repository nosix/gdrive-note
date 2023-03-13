async function main() {
    console.log(window.location.href);

    const queryParam = new Map(
        location.search.substring(1)
            .split("&")
            .map((s) => s.split("="))
    );
    const state = JSON.parse(decodeURIComponent(queryParam.get("state")));
    console.log(state);
}

window.onload = main;
