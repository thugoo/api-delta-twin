# Delta Twin - backend services

Platform for displaying the current status of the Delta Centre's study and research facility, utilizing real-time data from the building’s automation system and various deployed sensors.

**This project contains the source code for the backend services, including data querying functionalities and API.**  
Project containing the source code for the web application can be found [here.](https://github.com/thugoo/client-delta-twin)

API endpoints are available at http://172.17.89.119.nip.io/api. Access requires a connection to the UT VPN.

API endpoints:  
**/api/measurements** - Temperature and CO2 concentration measurements from the rooms.

```
// Example of the /api/measurements JSON structure

{
  "1018": {
    "qe_temperature": "22.3",
    "qe_temperature_time": "2024-05-01T08:14:00.000Z",
    "qe_co2": "430",
    "qe_co2_time": "2024-05-01T08:14:00.000Z"
  },
  "1004": {
  "qe_temperature": "21.8",
  "qe_temperature_time": "2024-05-01T08:14:00.000Z",
  "qe_co2": "442",
  "qe_co2_time": "2024-05-01T08:14:00.000Z"
  }
  // ... for each room
}
```

**/api/timetables** - Timetable data from the rooms.  


```
// Example of the /api/timetables JSON structure

{
  "1005": {
    "current_event":
      {
        "title": "Sotsiaalse ettevõtluse alused",
        "study_work_type": "lecture",
        "begin_time": "09:15",
        "end_time": "12:00"
      },
    "events": [
      {
        "title": "Sotsiaalse ettevõtluse alused",
        "study_work_type": "lecture",
        "begin_time": "09:15",
        "end_time": "12:00"
      },
      {
        "title": "Eraisiku rahandus",
        "study_work_type": "lecture",
        "begin_time": "16:15",
        "end_time": "18:00"
      }
    ]
  }
  // ... for each room with 'has_events' value as true in 'room_mapping.json'
}
```


**Workflow flowchart:**

![Workflow](workflow.svg)

<br>

# File structure


# Deploying the backend services

The backend services utilize Docker for deployment

To build and start the container, follow these steps:

1. Open your terminal and navigate to the project directory.
2. Run the command `docker compose up --build` in your terminal.
