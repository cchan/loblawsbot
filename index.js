/*

Basically my task is to do this:
https://stackoverflow.com/questions/48620140/use-the-google-navigation-card-in-my-dialogflow-agent
https://dialogflow.com/docs/fulfillment
https://developers.google.com/maps/documentation/javascript/directions

https://medium.com/google-developer-experts/handling-permissions-with-dialogflow-and-actions-on-google-b08c8f228c00
sample code is good

*/


'use strict';

const functions = require('firebase-functions');
const {Permission, dialogflow, Suggestions, BasicCard} = require('actions-on-google');

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
});

app.intent('LocationGranted', (agent, params, granted) => {
  if (granted && agent.device.location) {
    const location = agent.device.location;
    agent.ask(`You are at ${JSON.stringify(location)}`);
    agent.ask(`Here are directions to Loblaws:`);
    agent.ask(new BasicCard({
      title: `Directions to Loblaws`,
      subtitle: `It should take about 10 minutes.`,
      image: {
        url: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
        accessibilityText: 'Directions to Loblaws',
      },
      buttons: [{
        title: 'View on Google Maps',
        openUrlAction: {url: 'https://assistant.google.com/'},
      }],
    }));
    // agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  } else {
    agent.ask('Sorry, I could not figure out where you are.');
  }
});

app.intent('InStock', agent => {
  agent.ask(`Got an in stock request ${JSON.stringify(agent.parameters)}`);
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
