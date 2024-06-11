const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');


async function queryCumulocity() {

    // Measurement data points are queried between one minute ago and the current time.
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const currentMinute = new Date(Date.now()).toISOString();

    let lastQueries;

    /**
     * Check if measurements from the last querying run exist.
     * 
     * If no data points for a measurement are returned from the current querying run, 
     * the corresponding measurement values from the last querying run are used.
     */
    if (fs.existsSync('measurements.json')) {
        lastQueries = JSON.parse(fs.readFileSync('measurements.json', 'utf8'));
    } else {
        lastQueries = {};
    }

    let data = {};

    for (let roomData of rooms) {

        let result = {}

        let roomNumber = roomData["room_number"];
        let deviceId = roomData["qe_device_id"];

        for (let key of Object.keys(roomData["types"])) {
            
            // Value types must not contain whitespaces in Cumulocity queries.
            let type = roomData["types"][key].replace(/\s/g, '')

            if (type) {
                const endpoint = `/measurement/measurements?source=${deviceId}&dateFrom=${oneMinuteAgo}&dateTo=${currentMinute}&valueFragmentType=${type}`;
                const response = await axios.get(`${domain}${endpoint}`, {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
                    }
                });

                /**
                 * Follows the logic:
                 * 
                 * 1. if data points for a measurement are returned.
                 * 
                 * 2. else if data points for a measurement are not returned, 
                 *    but corresponding measurement values from the last querying run exist.
                 * 
                 * 3. else if data points for a measurement are not returned
                 *    and corresponding measurement values from the last querying run do not exist.
                 * 
                 */
                if (response.data["measurements"].length > 0) {
                    let date = new Date(response.data["measurements"][0]["time"]);
                    date.setSeconds(0, 0);
                    let formattedDate = date.toISOString();
                    let decimal = (type.includes("DP")) ? 0 : 1
                    result[key] = parseFloat(response.data["measurements"][0][type]["T"]["value"]).toFixed(decimal);
                    result[`${key}_time`] = formattedDate;

                } else if (roomNumber in lastQueries && lastQueries[roomNumber][key]) {
                    result[key] = lastQueries[roomNumber][key];
                    result[`${key}_time`] = lastQueries[roomNumber][`${key}_time`];

                } else {
                    result[key] = "No data";
                    result[`${key}_time`] = "No data";
                }

            } else {
                result[key] = "No data";
                result[`${key}_time`] = "No data";
            }
        }

        data[roomData["room_number"]] = result

    }

    fs.writeFileSync('measurements.json', JSON.stringify(data, null, 2));
    console.info(`Successfully queried Cumulocity. "measurements.json" file updated at ${new Date().toISOString()}`);
}


/**
 * Initial boot setup.
 * 
 * 1. Read in the authorization information for Cumulocity from "auth.json".
 * 2. Configure the mappings between room numbers and device ID values.
 * 3. Start querying Cumulocity for temperature and CO2 concentration values.
 */
const auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));

const domain = auth["domain"];
const username = auth["username"];
const password = auth["password"];

let rooms;

try {
    const jsonString = fs.readFileSync("mappings.json", 'utf8');

    const roomMappings = JSON.parse(jsonString);
    rooms = [];

    for (let roomNumber in roomMappings) {
        rooms.push(
            {
                "room_number": roomNumber,
                "qe_device_id": roomMappings[roomNumber]["qe_device_id"],
                "types": {
                    "qe_temperature": roomMappings[roomNumber]["qe_temperature"],
                    "qe_co2": roomMappings[roomNumber]["qe_co2"]
                }
            }  
        );
    }
} catch (err) {
    console.error(err);
}

// Querying Cumulocity initially and then every minute thereafter.
queryCumulocity();
cron.schedule('* * * * *', queryCumulocity);
