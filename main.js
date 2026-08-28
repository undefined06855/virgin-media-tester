const server = Bun.serve({
    routes: {
        "/status": async req => {
            return new Response(JSON.stringify(await (async () => {
                let res = await fetch(
                    "https://api.vmo2digital.co.uk/faults/workflow-service-status/v1", {
                        headers: {
                            "dapi-appid": "PR2HJ4yVbIK6vg0uQLXvqR1GjNX40gLOxkFoKMYeGGlGBrZC",
                            "dapi-channelid": "Care-SelfCare-WEB",
                            "dapi-clientsecret": "lnlzYDi9zqxr7NiLS1N7YZPZ1tNN27uK1yY7ktRveZZGAMhaRGmkNd3o3iQRQHI8",
                            "dapi-conversationid": "8d25717d-66eb-4eae-bd35-080b7fcffbf4",
                            "dapi-correlationid": "699daf6a-402a-4b10-9d6d-270e7b56f93b",
                            "dapi-originatorid": "699daf6a-402a-4b10-9d6d-270e7b56f93b",
                            "dapi-requestid": "699daf6a-402a-4b10-9d6d-270e7b56f93b",
                        }
                    }
                );

                if (res.status != 200) {
                    return { "error": `invalid response code ${res.status}` };
                }

                let json = await res.json();

                if (!("outages" in json)) {
                    return { "error": "invalid response" };
                }

                let outages = [];
                for (let outage of json["outages"]) {
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

    port: process.env.PORT
});

console.log(`Hosting wifi status at port ${server.port}`);
