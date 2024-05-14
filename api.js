const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Use the domain name assigned to the web application
const clientUrl = "http://172.17.89.119.nip.io/";

// For local testing
// const clientUrl = "http://localhost:3000";

// CORS is used when no TSL certificate is used
app.use(cors({ origin: clientUrl }))

app.get('/api/measurements', (req, res) => {
    fs.readFile('room_measurements.json', 'utf8', (err, fileData) => {

        if (err) {
            res.status(500).send('Error reading data');
            throw err;
        }

        let data = JSON.parse(fileData);

        if (data) {
            res.json(data);
        } else {
            res.status(404).send('No data available!');
        }
    });
});


app.get('/api/timetables', (req, res) => {
    fs.readFile('room_timetables.json', 'utf8', (err, fileData) => {

        if (err) {
            res.status(500).send('Error reading data');
            throw err;
        }

        let data = JSON.parse(fileData);

        if (data) {
            res.json(data);
        } else {
            res.status(404).send('No data available!');
        }
    });
});

app.listen(port, () => console.log('API started, running on port 5000'));