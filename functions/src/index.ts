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
const {WebhookClient, Suggestion, Card} = require('dialogflow-fulfillment');
const {Permission} = require('actions-on-google');

const gMaps = require('@google/maps').createClient({
  key: process.env.GMAPS_API_KEY,
  Promise: Promise
});


const intentMap = new Map();

intentMap.set('Default Welcome Intent', agent => {
  agent.add(`Hello! I'm your virtual Loblaws assistant. Ask me anything - for example, where's the nearest Loblaws?`);
  agent.add(new Suggestion(`Where's the nearest Loblaws?`));
  agent.add(new Suggestion(`Directions to Loblaws`));
});

intentMap.set('Location', agent => {
  if(agent.requestSource == agent.ACTIONS_ON_GOOGLE){
    const conv = agent.conv();
    conv.ask(new Permission({
      context: `To find the nearest Loblaw's location to you`,
      permissions: ['DEVICE_PRECISE_LOCATION'],
    }));
    agent.add(conv);
    agent.add(new Suggestion("Yes"));
    agent.add(new Suggestion("No"));
  }
  else {
    agent.add("Not implemented");
  }
});

intentMap.set('LocationGranted', (agent) => {
  let origincoords = null;
  if(agent.requestSource == agent.ACTIONS_ON_GOOGLE){
    const conv = agent.conv();
    if(conv.device.location) {
      origincoords = conv.device.location.coordinates.latitude + ',' + conv.device.location.coordinates.longitude;
    } else {
      agent.add('Sorry, I could not figure out where you are.');
    }
  }
  else{
    agent.add('An error occurred.');
  }
  if(origincoords !== null)
    return gMaps.directions({
      origin: origincoords,
      destination: '\"Loblaws\"', // 'place_id:' + res.json.candidates[0].place_id
      mode: 'driving',
    }).asPromise()
    .then(res => {
      const destcoords = res.json.routes[0].legs[0].end_location.lat + ',' + res.json.routes[0].legs[0].end_location.lng;
      agent.add(`Here's your directions! It's a ${res.json.routes[0].legs[0].duration.text} drive to the nearest Loblaws.`);
      agent.add(new Card({
        title: `Directions to Loblaws`,
        imageUrl: 'https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&markers=color:red%7C'+origincoords+'&markers=color:green%7C'+destcoords+'&key='+process.env.GMAPS_API_KEY,
        text: `Car trip: ${res.json.routes[0].legs[0].duration.text}, ${res.json.routes[0].legs[0].distance.text}`,
        buttonText: 'View on Google Maps',
        buttonUrl: 'https://www.google.ca/maps/dir/?api=1&origin='+origincoords+'&destination=%22Loblaws%22',
      }));
    }).catch(err => {
      agent.add("An error occurred: " + JSON.stringify(err));
    });
});

intentMap.set('InStock', agent => {
  agent.add(`Got an in stock request ${JSON.stringify(agent.parameters)}`);
});

export const dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  agent.handleRequest(intentMap);
});
