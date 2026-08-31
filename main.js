class DAPIResult {
    /** @type {string | null} */ error = null;
    /** @type {Array<object> | null} */ outages = null;

    static err(error) {
        let res = new DAPIResult();
        res.error = error;
        return res;
    }

    static ok(outages) {
        let res = new DAPIResult();
        res.outages = outages;
        return res;
    }
};

class DAPIFetcher {
    /** @type {object} */ headers;

    /**
     * Fetches the info from the API, and refreshes headers if they are invalid.
     * @param {boolean} quitIfFailed
     * @returns {Promise<DAPIResult>}
     */
    async fetchInfos(quitIfFailed = false) {
        let res = await fetch("https://api.vmo2digital.co.uk/faults/workflow-service-status/v1", { headers: this.headers });

        if (res.status == 401 || res.status == 403) {
            if (quitIfFailed) {
                return DAPIResult.err("failed to fetch tokens");
            }

            await this.refreshTokens();
            return await this.fetchInfos(/* quit if failed again */ true);
        }

        if (res.status != 200) {
            return DAPIResult.err(`unknown response code ${res.status}`);
        }

        let json = await res.json();
        if (!("outages" in json)) {
            return DAPIResult.err("invalid response from api");
        }

        return DAPIResult.ok(json["outages"]);
    }

    /**
     * Spawns a Bun webview to simulate normal navigation to refresh the tokens for the headers.
     * I wish I could've done this without spawning a WHOLE browser but I really couldn't figure it out, I even went as
     * far as looking through the webpacked Angular code and call some auth functions but it seems to pull the token
     * out of its ass and I can't find out why, please please if anyone can figure something out it would be infinitely
     * better than this...
     * (well I guess at least this one won't break if they change the API randomly)
     * @returns {Promise}
     */
    async refreshTokens() {
        return new Promise(async resolve => {
            console.time("refresh tokens");
            const view = new Bun.WebView({
                backend: {
                    type: "chrome",
                    argv: process.env.BROWSER_ARGV_APPEND.split(" ")
                },
            });

            await view.navigate("about:blank");

            await view.cdp("Network.enable");
            view.addEventListener("Network.requestWillBeSent", async event => {
                let data = event.data.request
                let url = new URL(data.url);

                // this is the request we want to capture the headers of
                if (url.pathname == "/faults/workflow-service-status/v1" && data.method == "GET") {
                    this.headers = data.headers;
                    resolve();

                    view.close();
                    console.timeEnd("refresh tokens");
                }

                // after a bit, the website temporarily redirects to a few pages to refresh some oauth tokens, so we
                // should only start doing shit after it's finished with whatever its doing
                if (url.pathname == "/help/check/auth-deflection") {
                    try {
                        await view.click("button#privacy_pref_optout");
                    } catch(err) {
                        // common failure point for some reason and im not sure why
                        console.log("click fail");
                        await Bun.write("click_fail.png", await view.screenshot());
                        throw err;
                    }

                    await view.click("input#postcode");
                    await view.type(process.env.VIRGIN_MEDIA_POSTCODE);
                    await view.click("input#lastName");
                    await view.type(process.env.VIRGIN_MEDIA_SURNAME);

                    await view.click(".identify-customer__check--submit > button");
                }
            });

            await view.navigate("https://www.virginmedia.com/help/check/status/identification/identify");

            // update the view a bunch, else the auth deflection redirect never happens
            await view.evaluate("123");
            await view.evaluate("123");
            await view.evaluate("123");
            await view.evaluate("123");
            await view.evaluate("123");
            await view.evaluate("123");
        });
    }
}

let fetcher = new DAPIFetcher();

const server = Bun.serve({
    routes: {
        "/status": async req => {
            return new Response(JSON.stringify(await (async () => {
                let res;
                try {
                    res = await fetcher.fetchInfos()
                } catch(err) {
                    console.error(err);
                    return { error: `internal server error: ${err}` };
                }

                if (res.error) {
                    return { error: res.error };
                }

                let outages = [];
                for (let outage of res.outages) {
                    if (!outage["productImpacted"].includes("BB")) continue;

                    outages.push({
                        outageType: outage["outageType"],
                        customerDescription: outage["customerDescription"],
                        estimatedFixTime: outage["estimatedFixTime"],
                        outageStatus: outage["outageStatus"],
                    })
                }

                return { outages };
            })()), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        },

        "/": new Response("Yes!", {  headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" } })
    },

    port: process.env.PORT,
    idleTimeout: 20
});

console.log(`Hosting wifi status at port ${server.port}`);

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
