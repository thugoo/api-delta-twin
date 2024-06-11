const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs')


async function querySis() {

    const currentDate = new Date();
    const formattedDate = dateToLocalIso(currentDate).split('T')[0];

    for (let room of Object.keys(roomSisTimetables)) {

        if (Object.keys(roomSisTimetables[room]).length !== 0) {
            payload.room = room;
            payload.date = formattedDate;
            let eventsData = [];

            try {
                const response = await axios.post(endpoint, payload, { headers: headers });
                if (response.status === 200) {
                    const events = response.data.events;

                    // If the room has any events scheduled in the timetable.
                    if (events) {
                        for (let event of events) {
                            if (event.event_type.code !== "reservation") {
                                let studyWorkType = event.study_work_type ? event.study_work_type.code : null;
                                let title = event.course_title ? event.course_title.et : null;

                                let eventData = {
                                    title: title,
                                    study_work_type: studyWorkType,
                                    begin_time: event.time.begin_time.slice(0, 5),
                                    end_time: event.time.end_time.slice(0, 5)
                                };

                                eventsData.push(eventData);
                            }
                        }
                    }
                    roomSisTimetables[room]['events'] = eventsData;
                } else {
                    console.error(`Response status not 200: ${response.status}, ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Error occurred while requesting ${endpoint}:`, error.message);
            }
        }
    }

    fs.writeFileSync('room_sis_timetables.json', JSON.stringify(roomSisTimetables, null, 2));
    console.info(`Successfully queried SIS. "room_sis_timetables.json" file updated at ${new Date().toISOString()}`);
}


/**
 * Used for querying readings from the SIS API.
 * This is to avoid querying the day before.
 *
 * For example, querying with an ISO string at 1 AM Europe/Tallinn time
 * would return yesterday's timetable information.
 */
function dateToLocalIso(date) {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal = date.getTime() - offsetMs;

    const dateLocal = new Date(msLocal);

    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);

    return `${isoLocal}.000Z`;
}


function processCurrentEvent() {

    function convertTimeStringToDate(timeString) {
        let now = new Date();
        let [hours, minutes] = timeString.split(':');
        now.setHours(hours, minutes, 0);
        return now;
    }

    const jsonString = fs.readFileSync("room_sis_timetables.json", 'utf8');
    roomSisTimetables = JSON.parse(jsonString);
    let currentTime = new Date();
    for (let [room, timetable] of Object.entries(roomSisTimetables)) {

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

    fs.writeFileSync('room_sis_timetables.json', JSON.stringify(roomSisTimetables, null, 2));
    console.info(`Successfully processed current SIS timetable events. "room_sis_timetables.json" file updated at ${new Date().toISOString()}`);
}


async function initialize() {
    await querySis();
    processCurrentEvent();
}


/**
 * Initial boot setup.
 * 
 */
const endpoint = "https://ois2.ut.ee/api/timetable/room";
const headers = { 'Content-Type': 'application/json' };

// Payload for /api/timetable/room endpoint.
let payload = {
    "building": "NAR18OH",
    "room": "",
    "date": ""
};

let roomSisTimetables;

try {
    const jsonString = fs.readFileSync("room_mapping.json", 'utf8');

    const roomMappings = JSON.parse(jsonString);
    const rooms = Object.keys(roomMappings);

    const roomTimetableTemplate = {
        current_event: null,
        events: []
    };

    roomSisTimetables = {};

    /**
     * Checks the following:
     * 
     * 1. If the room has timetable events.
     * 2. If the room timetables are from SIS.
     */
    rooms.forEach(room => {
        if (roomMappings[room].has_timetable_events && room.substring(0, 2) !== "QR") {
            roomSisTimetables[room] = { ...roomTimetableTemplate };
        } else {
            roomSisTimetables[room] = {};
        }
    });
} catch (err) {
    console.error(err);
}

// Querying SIS initially and then every minute thereafter.
initialize().then(() => {
    cron.schedule('* * * * *', async () => {
        await querySis();
        processCurrentEvent();
    });
});