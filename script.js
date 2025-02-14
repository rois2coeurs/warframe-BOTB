import worldstateData from 'warframe-worldstate-data';
import env from 'dotenv';
env.config();

let timeoutId;

async function main() {
    const data = await fetchJadeShadowsAlerts();
    for (let i = 0; i < data.length; i++) {
        await postToWebhook(formatMission(data[i]));
    }
    const nextTimeout = getNextTimeout(data);
    timeoutId = setTimeout(next, nextTimeout);
    console.log("Next alert in " + nextTimeout / 1000 + " seconds");
}


async function next() {
    clearTimeout(timeoutId);
    const data = await fetchJadeShadowsAlerts();
    const lastMission = getLatestMission(data);
    await postToWebhook(formatMission(lastMission));
    const nextTimeout = getNextTimeout(data);
    timeoutId = setTimeout(next, nextTimeout);
    console.log("Next alert in " + nextTimeout / 1000 + " seconds");
}

function getNextTimeout(data) {
    return getOldestActiveMission(data).Expiry.$date.$numberLong - Date.now() + 2000;
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
    const missionTier = getMissionTier(mission);
    let msg = `\`${missionTier} Tier\` ${node.enemy} **${missionType.value}** - ${node.value} - Expire: ${msToTimespanDiscord(mission.Expiry.$date.$numberLong)}`;
    const role = pingRoleForTier(missionTier);
    if (role !== '') msg += ` ||${role}||`;
    return msg;
}

function msToTimespanDiscord(ms) {
    return `<t:${parseInt(ms) / 1000}:R>`;
}

function pingRoleForTier(tier) {
    const envVar = tier.toUpperCase() + '_TIER_ROLE_ID';
    const tierRoleId = process.env[envVar];
    if (tierRoleId === undefined) {
        return '';
    }
    return `<@&${process.env[envVar]}>`;
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

function getLatestMission(data) {
    data = data.sort((a, b) => parseInt(b.Expiry.$date.$numberLong) - parseInt(a.Expiry.$date.$numberLong) );
    return data[0];
}

function getOldestActiveMission(data) {
    data = data.filter((item) => parseInt(item.Expiry.$date.$numberLong) > Date.now());
    data = data.sort((a, b) => parseInt(a.Expiry.$date.$numberLong) - parseInt(b.Expiry.$date.$numberLong) );
    return data[0];
}

main();