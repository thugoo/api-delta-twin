const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs')


async function queryDeltaqr() {

    // Mapping of the DeltaQR room number/API id values
    const qrRoomCodes = {
        A: 24,
        B: 26,
        C: 28,
        D: 30,
        E: 32,
        F: 34,
        G: 36,
        H: 38,
        I: 40,
        J: 42
    };

    const qrEndpoint = "https://deltaqr.ut.ee/bookings";
    const headers = { 'Content-Type': 'application/json' };

    let today = new Date()
    const offset = today.getTimezoneOffset()
    today = new Date(today.getTime() - (offset * 60 * 1000))
    today = today.toISOString().split('T')[0]

    for (let room of Object.keys(roomDeltaqrTimetables)) {
        if (room.substring(0, 2) == "QR") {

            let query = `${qrEndpoint}/${qrRoomCodes[room.charAt(3)]}/${today}/${today}`
            let processedEvents = [];

            try {
                const response = await axios.post(query, { headers: headers });
                if (response.status === 200) {
                    const events = response.data.events;
                    if (events) {
                        for (let event of events) {
                            let studyWorkType = null;
                            let title = null;

                            let startDate = new Date(event.start);
                            let startFormattedTime = startDate.toLocaleTimeString('en-US', {
                                timeZone: 'Europe/Tallinn',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }).substring(0, 5);

                            let endDate = new Date(event.end);
                            let endFormattedTime = endDate.toLocaleTimeString('en-US', {
                                timeZone: 'Europe/Tallinn',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }).substring(0, 5);

                            let processedEvent = {
                                title: title,
                                study_work_type: studyWorkType,
                                begin_time: startFormattedTime,
                                end_time: endFormattedTime
                            };

                            processedEvents.push(processedEvent);
                        }
                    }
                    roomDeltaqrTimetables[room]['events'] = processedEvents;
                } else {
                    console.error(`Error: ${response.status}, ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Error making request to ${query}:`, error.message);
            }
        }
    }

    fs.writeFileSync('timetables_deltaqr.json', JSON.stringify(roomDeltaqrTimetables, null, 2));
    console.info(`Successsfully queried DeltaQR. "timetables_deltaqr.json" file updated at ${new Date().toISOString()}`);
}


function processCurrentEvent() {

    function convertTimeStringToDate(timeString) {
        let now = new Date();
        let [hours, minutes] = timeString.split(':');
        now.setHours(hours, minutes, 0);
        return now;
    }

    const jsonString = fs.readFileSync("timetables_deltaqr.json", 'utf8');
    roomDeltaqrTimetables = JSON.parse(jsonString);
    let currentTime = new Date();
    for (let [room, timetable] of Object.entries(roomDeltaqrTimetables)) {

        if (Object.keys(timetable).length !== 0) {
            is_current = false;
            for (reservation of timetable.events) {
                let beginTime = convertTimeStringToDate(reservation.begin_time);
                let endTime = convertTimeStringToDate(reservation.end_time);
                if (currentTime >= beginTime && currentTime <= endTime) {
                    timetable.current_event = reservation;
                    is_current = true;
                    break;
                }
            }

            if (!is_current) {
                timetable.current_event = null;
            }
        }
    }

    fs.writeFileSync('timetables_deltaqr.json', JSON.stringify(roomDeltaqrTimetables, null, 2));
    console.info(`Successfully processed current DeltaQR timetable events. "timetables_deltaqr.json" file updated at ${new Date().toISOString()}`);
}


async function initialize() {
    await queryDeltaqr();
    processCurrentEvent();
}


let roomDeltaqrTimetables;

try {
    const jsonString = fs.readFileSync("mappings.json", 'utf8');

    const roomMappings = JSON.parse(jsonString);
    const rooms = Object.keys(roomMappings);

    const roomTimetableTemplate = {
        current_event: null,
        events: []
    };

    roomDeltaqrTimetables = {};

    /**
     * Checks the following:
     * 
     * 1. If the room has timetable events.
     * 2. If the room timetables are from DeltaQR.
     */
    rooms.forEach(room => {
        if (roomMappings[room].has_timetable_events && room.substring(0, 2) === "QR") {
            roomDeltaqrTimetables[room] = { ...roomTimetableTemplate };
        } else {
            roomDeltaqrTimetables[room] = {};
        }
    });
} catch (err) {
    console.error(err);
}


// Querying DeltaQR initially and then every minute thereafter.
initialize().then(() => {
    cron.schedule('* * * * *', async () => {
        await queryDeltaqr();
        processCurrentEvent();
    });
});