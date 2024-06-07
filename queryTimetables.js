const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs')

const endpoint = "https://ois2.ut.ee/api/timetable/room";
const headers = { 'Content-Type': 'application/json' };

// payload for SIS endpoint
let payload = {
    "building": "NAR18OH",
    "room": "",
    "date": ""
};

let roomTimetables = {};

try {
    const jsonString = fs.readFileSync("room_mapping.json", 'utf8');

    const roomsData = JSON.parse(jsonString);
    const rooms = Object.keys(roomsData);

    const roomTimetableTemplate = {
        current_event: null,
        events: []
    };

    rooms.forEach(room => {
        if (roomsData[room].has_timetable_events) {
            roomTimetables[room] = { ...roomTimetableTemplate };
        }
    });

    fs.writeFileSync('room_timetables.json', JSON.stringify(roomTimetables, null, 2));
} catch (err) {
    console.log("Error reading file:", err);
}


try {
    const jsonString = fs.readFileSync("room_timetables.json", 'utf8');
    roomTimetables = JSON.parse(jsonString);
} catch (err) {
    console.log("Error reading file:", err);
}


function dateToISOButLocal(date) {
    /**
     * Used for querying readings from the SIS API.
     * Avoids e.g. querying the day before at 1 AM Europe/Tallinn time.
     */
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal = date.getTime() - offsetMs;

    const dateLocal = new Date(msLocal);

    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);

    return `${isoLocal}.000Z`;
}


async function querySis() {
    const currentDate = new Date();
    const formattedDate = dateToISOButLocal(currentDate).split('T')[0];
    for (let room of Object.keys(roomTimetables)) {
        if (room.substring(0, 2) != "QR") {
            payload.room = room;
            payload.date = formattedDate;
            let processedEvents = [];
            try {
                const response = await axios.post(endpoint, payload, { headers: headers });
                if (response.status === 200) {
                    const events = response.data.events;
                    if (events) {
                        for (let event of events) {
                            if (event.event_type.code !== "reservation") {
                                let studyWorkType = event.study_work_type ? event.study_work_type.code : null;
                                let title = event.course_title ? event.course_title.et : null;

                                let processedEvent = {
                                    title: title,
                                    study_work_type: studyWorkType,
                                    begin_time: event.time.begin_time.slice(0, 5),
                                    end_time: event.time.end_time.slice(0, 5)
                                };

                                processedEvents.push(processedEvent);
                            }
                        }
                    }
                    roomTimetables[room]['events'] = processedEvents;
                } else {
                    console.log(`Error: ${response.status}, ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Error making request to ${endpoint}:`, error.message);
            }
        }
    }

    fs.writeFileSync('room_timetables.json', JSON.stringify(roomTimetables, null, 2));
    console.log(`SIS querying completed, "room_timetables.json" file updated at ${new Date().toISOString()}`);
}


async function queryMeetingRooms() {

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

    for (let room of Object.keys(roomTimetables)) {
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
                    roomTimetables[room]['events'] = processedEvents;
                } else {
                    console.log(`Error: ${response.status}, ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Error making request to ${query}:`, error.message);
            }
        }
    }

    fs.writeFileSync('room_timetables.json', JSON.stringify(roomTimetables, null, 2));
    console.log(`Meeting rooms querying completed, "room_timetables.json" file updated at ${new Date().toISOString()}`);
}

function processCurrentEvent() {

    function convertTimeStringToDate(timeString) {
        let now = new Date();
        let [hours, minutes] = timeString.split(':');
        now.setHours(hours, minutes, 0);
        return now;
    }

    const jsonString = fs.readFileSync("room_timetables.json", 'utf8');
    roomTimetables = JSON.parse(jsonString);
    let currentTime = new Date();
    for (let [room, timetable] of Object.entries(roomTimetables)) {
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

    fs.writeFileSync('room_timetables.json', JSON.stringify(roomTimetables, null, 2));
    console.log(`Current events processing completed, "room_timetables.json" file updated at ${new Date().toISOString()}`);
}

async function initialQuerying() {
    await querySis();
    await queryMeetingRooms();
    processCurrentEvent();
}

initialQuerying();

// SIS timetables are queried once every 24 hrs, 
// DeltaQR is queried and events are processed every minute.
cron.schedule('* * * * *', async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        await querySis();
    }
    await queryMeetingRooms();
    processCurrentEvent();
});