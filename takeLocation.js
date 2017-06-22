var express = require('express');
var bodyParser = require('body-parser');
var admin = require("firebase-admin");
var app = express();

//Initialize the firebase admin sdk
var serviceAccount = require("./serviceAccountKey.json");
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
app.get('/childLocation', function(request, response) {
    id = request.query['id'];
    latitude = request.query['latitude'];
    longitude = request.query['longitude'];
    sendNotification();
    response.send('Location received of Student ID: "' + request.query['id'] + '".');
});

//Handles requests to localhost:8089/busLocation
app.get('/busLocation', function(request, response) {
    id = request.query['id'];
    latitude = request.query['latitude'];
    longitude = request.query['longitude'];

    //Store this location in database
    db.ref('buses/' + id + "/location").set({
        lat: latitude,
        lon: longitude
    });

    response.send('Location received of Bus ID: "' + request.query['id'] + '".');
});

app.listen(8089, function() {
    console.log('Server running at localhost:8089');
});

function sendNotification() {
    //send notification only if the id exists in database
    var ref = db.ref("students/" + id);
    ref.once("value", function(snapshot) {
        var data = snapshot.val();
        console.log(data);
        if (data != null) {
            topic = id;
            var payload = {
                notification: {
                    title: "Child Tracking System",
                    body: "Location of child received"
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
