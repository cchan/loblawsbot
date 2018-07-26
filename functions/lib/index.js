/*

Note: npm i -g firebase-tools

Basically my task is to do this:
https://stackoverflow.com/questions/48620140/use-the-google-navigation-card-in-my-dialogflow-agent
https://dialogflow.com/docs/fulfillment
https://developers.google.com/maps/documentation/javascript/directions

https://medium.com/google-developer-experts/handling-permissions-with-dialogflow-and-actions-on-google-b08c8f228c00
sample code is good

https://discuss.api.ai/t/google-assistant-rich-message-responses/5134/19

https://developers.google.com/places/web-service/search#FindPlaceRequests

https://firebase.google.com/docs/functions/get-started
*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv-safe').config();
const functions = require('firebase-functions');
const { WebhookClient, Suggestion, Card, Payload } = require('dialogflow-fulfillment');
const { Permission } = require('actions-on-google');
const gMaps = require('@google/maps').createClient({
    key: process.env.GMAPS_API_KEY,
    Promise: Promise
});
const intentMap = new Map();
intentMap.set('Default Welcome Intent', agent => {
    // agent.locale == 'en' or 'fr'
    agent.add(`Hello! I'm your virtual Loblaws assistant. Ask me anything - for example, where's the nearest Zehr's?`); // Bonjour! Je suis votre assistant virtuel Loblaws. Demandez-moi quelque chose - par exemple, où est le Loblaws le plus proche?
    agent.add(new Suggestion(`Where's the nearest Zehr's?`)); // Où est le Loblaws le plus proche?
});
intentMap.set('Default Fallback Intent', agent => {
    const responses = [
        "I didn't get that. Can you say it again?",
        "I missed what you said. Say it again?",
        "Sorry, could you say that again?",
        "Sorry, can you say that again?",
        "Can you say that again?",
        "Sorry, I didn't get that.",
        "Sorry, what was that?",
        "One more time?",
        "What was that?",
        "Say that again?",
        "I didn't get that.",
        "I missed that.",
    ];
    agent.add(responses[Math.floor(Math.random() * responses.length)]);
});
intentMap.set('Location', agent => {
    agent.setContext({
        name: "storename",
        lifespan: 2,
        parameters: { storename: agent.parameters.LoblawsStoreName }
    });
    if (agent.requestSource == agent.ACTIONS_ON_GOOGLE) {
        const conv = agent.conv();
        conv.ask(new Permission({
            context: `To find the ${agent.parameters.LoblawsStoreName} nearest you`,
            permissions: ['DEVICE_PRECISE_LOCATION'],
        }));
        agent.add(conv).add(new Suggestion("Yes")).add(new Suggestion("No"));
    }
    else if (agent.requestSource == agent.FACEBOOK) {
        agent.add(new Payload(agent.FACEBOOK, {
            "text": `To find the ${agent.parameters.LoblawsStoreName} nearest you, I'll need to know your location.`,
            "quick_replies": [{ "content_type": "location" }]
        }));
    }
    else {
        agent.add("Sorry, I only know how to provide directions on Google Assistant and Facebook Messenger right now!");
    }
});
intentMap.set('LocationGranted', agent => {
    let origincoords = null;
    if (agent.requestSource == agent.ACTIONS_ON_GOOGLE) {
        const conv = agent.conv();
        if (conv.device.location) {
            origincoords = conv.device.location.coordinates.latitude + ',' + conv.device.location.coordinates.longitude;
        }
        else {
            agent.add('Sorry, I could not figure out where you are.'); // 
        }
    }
    else if (agent.requestSource == agent.FACEBOOK) {
        let latlong = agent.getContext('facebook_location');
        origincoords = latlong.lat + ',' + latlong.long;
    }
    else {
        agent.add('An error occurred.');
    }
    console.log("CONTEXTS INCOMING:", agent.contexts);
    let storename = agent.getContext("storename").storename;
    agent.setContext({ name: 'storename', lifespan: 0 });
    if (origincoords !== null)
        return gMaps.directions({
            origin: origincoords,
            destination: '\"' + storename + '\"',
            mode: 'driving',
        }).asPromise()
            .then(res => {
            const destcoords = res.json.routes[0].legs[0].end_location.lat + ',' + res.json.routes[0].legs[0].end_location.lng;
            agent.add(`Here's your directions! It's a ${res.json.routes[0].legs[0].duration.text} drive to the nearest ${storename}.`);
            agent.add(new Card({
                title: `Directions to ${storename}`,
                imageUrl: 'https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&markers=color:red%7C' + origincoords + '&markers=color:green%7C' + destcoords + '&key=' + process.env.GMAPS_API_KEY,
                text: `Car trip: ${res.json.routes[0].legs[0].duration.text}, ${res.json.routes[0].legs[0].distance.text}`,
                buttonText: 'View on Google Maps',
                buttonUrl: 'https://www.google.ca/maps/dir/?api=1&origin=' + origincoords + '&destination=%22' + storename + '%22',
            }));
        }).catch(err => {
            agent.add("An error occurred: " + JSON.stringify(err));
        });
});
intentMap.set('InStock', agent => {
    agent.add(`Got an in stock request ${JSON.stringify(agent.parameters)}`);
});
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    console.log("!!!", JSON.stringify(agent.originalRequest));
    if (agent.getContext('facebook_location'))
        agent.handleRequest(intentMap.get('LocationGranted'));
    else
        agent.handleRequest(intentMap);
});
//# sourceMappingURL=index.js.map