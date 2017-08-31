var express = require('express');
var bodyParser = require('body-parser');
var admin = require("firebase-admin");
var app = express();

//Initialize the firebase admin sdk
try {
    var serviceAccount = require("./serviceAccountKey.json");
}
catch (e) {
    var serviceAccount = {
        "type": "service_account",
        "project_id": process.env.project_id,
        "private_key_id": process.env.private_key_id,
        "private_key": JSON.parse(process.env.private_key),
        "client_email": process.env.client_email,
        "client_id": process.env.client_id,
        "auth_uri": process.env.auth_uri,
        "token_uri": process.env.token_uri,
        "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
        "client_x509_cert_url": process.env.client_x509_cert_url
    }     
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://child-tracking-system-7fced.firebaseio.com/"
});
var db = admin.database();

//variables to store location
var id = "randomid";
var latitude = 0.0;
var longitude = 0.0;
var topic = id;

app.use(bodyParser.urlencoded({ extended: true }));

//Handles requests to localhost:8089/childLocation
app.post('/childLocation', function(request, response) {
    id = request.body.id;

    if (request.body.latitude != '' && request.body.longitude != '') {
        latitude = request.body.latitude;
        longitude = request.body.longitude;

        sendNotification();
        response.send('Location received of Student ID: "' + request.body.id + '".');
    }
});

//Handles requests to localhost:8089/busLocation
app.post('/busLocation', function(request, response) {
    id = request.body.id;

    if (request.body.latitude != '' && request.body.longitude != '') {
        latitude = request.body.latitude;
        longitude = request.body.longitude;

        //Store this location in database
        db.ref('buses/' + id + "/location").set({
            lat: latitude,
            lon: longitude
        });

        response.send('Location received of Bus ID: "' + request.body.id + '".');
    }
});

//Handles requests to /busStatus
app.post('/busStatus', function(request, response) {
    id = request.body.id;
    
    //Check if the status of the bus is of boolean type
    if (request.body.isActive == 'true' || request.body.isActive == 'false') {
        var ref = db.ref("buses/" + id + "/isActive");
        ref.once("value", function(snapshot) {

            //Check if the bus data is present in database
            if (snapshot.val() != null) {

                //If present, then update the bus status
                ref.set(request.body.isActive);
                response.send('200 OK');
            }
            else {
                response.send('400 Bad Request');
            }
        });
    }
    else {
        response.send('400 Bad Request');
    }
});

var server_port = process.env.PORT || 8085;
app.listen(server_port, function () {
    console.log( "Listening on " + server_port  );
});

function sendNotification() {
    //send notification only if the id exists in database
    var ref = db.ref("students/" + id);
    ref.once("value", function(snapshot) {
        var studentData = snapshot.val();
        console.log(studentData);
        if (studentData != null) {
            topic = id;
            var payload = {
                notification: {
                    title: "Child Tracking System",
                    body: "Location of " + studentData.name + " received"
                },
                data: {
                    latitude: latitude,
                    longitude: longitude
                }
            };
            admin.messaging().sendToTopic(topic, payload)
                .then(function(response) {
                    console.log(topic);
                    console.log(payload);
                    console.log("Successfully sent message:", response);
                })
                .catch(function(error) {
                    console.log("Error sending message:", error);
                });
        }
    });
}
