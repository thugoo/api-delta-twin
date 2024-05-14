const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');

const auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));

const domain = auth["domain"];
const username = auth["username"];
const password = auth["password"];


let queryRooms = {};

fs.readFile("room_mapping.json", 'utf8', (err, jsonString) => {
    if (err) {
        console.log("Error reading file:", err);
        return;
    }

    const mapping = JSON.parse(jsonString);

    queryRooms = [];

    for (let roomNumber in mapping) {
        queryRooms.push(
            {
                "room_number": roomNumber,
                "qe_device_id": mapping[roomNumber]["qe_device_id"],
                "types": {
                    "qe_temperature": mapping[roomNumber]["qe_temperature"],
                    "qe_co2": mapping[roomNumber]["qe_co2"]
                }
            }  
        );
    }
});


async function queryCumulocity() {

    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const currentMinute = new Date(Date.now()).toISOString();

    let lastQueries;

    if (fs.existsSync('room_measurements.json')) {
        lastQueries = JSON.parse(fs.readFileSync('room_measurements.json', 'utf8'));
    } else {
        lastQueries = {};
    }

    let data = {};

    for (let roomData of queryRooms) {

        let response = {}

        let roomNumber = roomData["room_number"];
        let deviceId = roomData["qe_device_id"];


        for (let key of Object.keys(roomData["types"])) {
            let type = roomData["types"][key].replace(/\s/g, '')
            if (type) {
                const endpoint = `/measurement/measurements?source=${deviceId}&dateFrom=${oneMinuteAgo}&dateTo=${currentMinute}&valueFragmentType=${type}`;
                const res = await axios.get(`${domain}${endpoint}`, {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                    }
                });

                if (res.data["measurements"].length > 0) {
                    let date = new Date(res.data["measurements"][0]["time"]);
                    date.setSeconds(0, 0);
                    let formattedDate = date.toISOString();
                    let decimal = (type.includes("DP")) ? 0 : 1
                    response[key] = parseFloat(res.data["measurements"][0][type]["T"]["value"]).toFixed(decimal);
                    response[`${key}_time`] = formattedDate;

                } else if (roomNumber in lastQueries) {
                    
                    response[key] = lastQueries[roomNumber][key];
                    response[`${key}_time`] = lastQueries[roomNumber][`${key}_time`];

                } else {
                    
                    response[key] = "No data";
                    response[`${key}_time`] = "No data";

                }

            } else {
                                    
                response[key] = "No data";
                response[`${key}_time`] = "No data";

            }
        }

        data[roomData["room_number"]] = response

    }

    fs.writeFileSync('room_measurements.json', JSON.stringify(data, null, 2));
    console.log(`Cumulocity querying completed, "room_measurements.json" file updated at ${new Date().toISOString()}`);
}


cron.schedule('* * * * *', queryCumulocity);
