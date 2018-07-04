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

require('dotenv-safe').config();
const functions = require('firebase-functions');
const {Permission, dialogflow, Suggestions, BasicCard} = require('actions-on-google');

const gMaps = require('@google/maps').createClient({
  key: process.env.GMAPS_API_KEY,
  Promise: Promise
});

const app = dialogflow({debug: true});

app.intent('Default Welcome Intent', agent => {
  agent.ask(`Hello! I'm your virtual Loblaws assistant. Ask me anything - for example, where's the nearest Loblaws?`);
  agent.ask(new Suggestions([`Where's the nearest Loblaws?`, `Directions to Loblaws`]));
});

app.intent('Location', agent => {
  agent.ask(new Permission({
    context: `To find the nearest Loblaw's location to you`,
    permissions: ['DEVICE_PRECISE_LOCATION'],
  }));
  agent.ask(new Suggestions([`Yes`, `No`]));
});

app.intent('LocationGranted', (agent, params, granted) => {
  if (granted && agent.device.location) {
    const origincoords = agent.device.location.coordinates.latitude + ',' + agent.device.location.coordinates.longitude;
    return gMaps.directions({
      origin: origincoords,
      destination: '\"Loblaws\"', // 'place_id:' + res.json.candidates[0].place_id
      mode: 'driving',
    }).asPromise()
    .then(res => {
      const destcoords = res.json.routes[0].legs[0].end_location.lat + ',' + res.json.routes[0].legs[0].end_location.lng;
      agent.ask(`Here's your directions! It's a ${res.json.routes[0].legs[0].duration.text} drive to the nearest Loblaws.`);
      agent.ask(new BasicCard({
        title: `Directions to Loblaws`,
        subtitle: `Car trip: ${res.json.routes[0].legs[0].duration.text}, ${res.json.routes[0].legs[0].distance.text}`,
        image: {
          url: 'https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&markers=color:red%7C'+origincoords+'&markers=color:green%7C'+destcoords+'&key='+process.env.GMAPS_API_KEY,
          accessibilityText: 'Directions to Loblaws',
        },
        buttons: [{
          title: 'View on Google Maps',
          openUrlAction: {url: 'https://www.google.ca/maps/dir/?api=1&origin='+origincoords+'&destination=%22Loblaws%22'},
        }],
      }));
    }).catch(err => {
      agent.ask("An error occurred: " + JSON.stringify(err));
    });
    // agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  } else {
    agent.ask('Sorry, I could not figure out where you are.');
  }
});

app.intent('InStock', agent => {
  agent.ask(`Got an in stock request ${JSON.stringify(agent.parameters)}`);
});

export const dialogflowFirebaseFulfillment = functions.https.onRequest(app);
