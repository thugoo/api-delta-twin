module.exports = {
    apps : [{
      name: "api",
      script: "./api.js",
      watch: true,
      ignore_watch : ["measurements.json", "timetables_sis.json", "timetables_deltaqr.json"],
      env: {
        "NODE_ENV": "development",
      },
      env_production: {
        "NODE_ENV": "production",
      }
    },{
      name: "querySis",
      script: "./querySis.js",
      watch: true,
      ignore_watch : ["measurements.json", "timetables_sis.json", "timetables_deltaqr.json"],
    },{
      name: "queryDeltaqr",
      script: "./queryDeltaqr.js",
      watch: true,
      ignore_watch : ["measurements.json", "timetables_sis.json", "timetables_deltaqr.json"],
    },{
      name: "queryCumulocity",
      script: "./queryCumulocity.js",
      watch: true,
      ignore_watch : ["measurements.json", "timetables_sis.json", "timetables_deltaqr.json"],
    }]
  };