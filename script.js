import worldstateData from 'warframe-worldstate-data';
import env from 'dotenv';
env.config();

let timeoutId;

async function main() {
    const data = await fetchJadeShadowsAlerts();
    for (let i = 0; i < data.length; i++) {
        await postToWebhook(formatMission(data[i]));
    }
    const nextTimeout = getNextTimeout(data[0]);
    timeoutId = setTimeout(next, nextTimeout);
    console.log("Next alert in " + nextTimeout / 1000 + " seconds");
}


async function next() {
    clearTimeout(timeoutId);
    const data = await fetchJadeShadowsAlerts();
    const lastMission = data[data.length - 1];
    await postToWebhook(formatMission(lastMission));
    const nextTimeout = getNextTimeout(data[1]);
    timeoutId = setTimeout(next, nextTimeout);
    console.log("Next alert in " + nextTimeout / 1000 + " seconds");
}

function getNextTimeout(mission) {
    return mission.Expiry.$date.$numberLong - Date.now() + 2500;
}

async function fetchJadeShadowsAlerts() {
    const res = await fetch("https://content.warframe.com/dynamic/worldState.php");
    let data = await res.json();
    data = data.Alerts;
    data = data.filter((item) => item.Tag === "JadeShadows");
    return data;
}

function formatMission(mission) {
    const node = worldstateData.solNodes[mission.MissionInfo.location];
    const missionType = worldstateData.missionTypes[mission.MissionInfo.missionType];
    return `\`${getMissionTier(mission)} Tier\` ${node.enemy} **${missionType.value}** - ${node.value} - Expire: ${msToTimespanDiscord(mission.Expiry.$date.$numberLong)}`;
}

function msToTimespanDiscord(ms) {
    return `<t:${parseInt(ms) / 1000}:R>`;
}

async function postToWebhook(message) {
    const webhookUrl = process.env.WEBHOOK_URL;
    const data = {
        content: message
    };
    await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    console.log(`Posted message: ${message}`);
}

function getMissionTier(mission) {
    const missionType = worldstateData.missionTypes[mission.MissionInfo.missionType];
    if (['Capture', 'Extermination'].includes(missionType.value)) {
        return 'S';
    }
    if (['Sabotage', 'Rescue', 'Spy', 'Hive'].includes(missionType.value)) {
        return 'A';
    }
    if (['Disruption', 'Assault', 'Defense', 'Hijack', 'Survival'].includes(missionType.value)) {
        return 'B';
    }
    if (['Defection', 'Mobile Defense', 'Interception', 'Excavation'].includes(missionType.value)) {
        return 'C';
    }
    return 'Unknown';
}

main();