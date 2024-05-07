# Delta Twin

Platform for visualizing the current status of the Delta Centre's study and research facility.  
It uses real-time data collected from the building's automation system and various deployed sensors.

**This project includes the source code for the data querying services and the API.**  
Project containing the source code for the web application can be found here: https://github.com/thugoo/client-delta-twin

API endpoints are available at http://172.17.89.119.nip.io/api. Access requires a connection to the UT VPN.

Available endpoints:  
**/api/measurements** -   
**/api/timetables** - 


**Workflow flowchart:**

![Workflow](workflow.svg)

<br>

# Deploying the data querying services and API

The back-end services are deployed using Docker.

To build the image and start the container running the back-end services, navigate to the project directory in your terminal.

Then, execute the following command:
`sudo docker compose up --build`

This command builds the necessary Docker image and starts the container.
