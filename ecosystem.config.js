module.exports = {
    apps : [{
      name: "api",
      script: "./api.js",
      watch: true,
      ignore_watch : ["room_measurements.json", "room_timetables.json"],
      env: {
        "NODE_ENV": "development",
      },
      env_production: {
        "NODE_ENV": "production",
      }
    },{
      name: "queryCumulocity",
      script: "./queryCumulocity.js",
      watch: true,
      ignore_watch : ["room_timetables.json", "room_measurements.json"],
    },{
      name: "queryTimetables",
      script: "./queryTimetables.js",
      watch: true,
      ignore_watch : ["room_timetables.json", "room_measurements.json"],
    }]
  };