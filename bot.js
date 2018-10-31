const botBuilder = require('claudia-bot-builder');
const fbTemplate = botBuilder.fbTemplate;
var util = require('util');
const ci = require('./civic_info')

// AWS
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
const dynamodb = new AWS.DynamoDB();

const TABLE_NAME = 'voting_info';
const INIT = "init";
const END = "end";
const ID = "id";
const STRING = "string";
const POLLING_LOCATIONS_1 = "pollingLocations1";
const POLLING_LOCATIONS_2 = "pollingLocations2";
const ELECTIONS_1 = "elections1";
const ELECTIONS_2 = "elections2";
const ELECTIONS_3 = "elections3";
const ADDRESS = "address";
const PREFIX = "&&&";
const DIVIDER = "|||";

// ----------------------------- HELPER FUNCTIONS ------------------------------

// check if current user text is an address
function isAddress(state) {
    return (state === POLLING_LOCATIONS_2 || state === ELECTIONS_2)
}

// extract current state in conversation
function extractState(text, data, userEntered) {
    try {
        var state = data.Item.State.S;

        if (userEntered && !isAddress(state)) {
            return INIT;
        } else {
            return (state === ADDRESS) ? text : state;
        }
    } catch (err) {
        return INIT;
    }
}

// output if error occurs
function errorOccurred() {
    return "Sorry, an error has occurred. If you wish to try again, say 'Hi'";
}

// get data from DynamoDB
function restoreCtx(sender) {
    console.log("Trying to restore context for sender", sender);

    var params = {
        TableName: TABLE_NAME,
        Key : {
            id: {
                S: sender
            }
        }
    };

    return dynamodb.getItem(params).promise();
}

// put data to DynamoDB
function persistCtx(sender, state) {
    var params = {
        TableName: TABLE_NAME,
        Item: {
            id: {
                S: sender
            },
            State: {
                S: state
            }
        }
    };

    return dynamodb.putItem(params).promise();
}

// extract relevant text
function getText(request) {
    if (request.text.length >= 3 && request.text.substring(0, 3) === PREFIX) {
        return [request.text.substring(3), false];
    } else {
        return [request.text, true];
    }
}

// ---------------------------- MAIN FUNCTIONALITY -----------------------------

// initial prompt to user
function init(sender) {
    return persistCtx(sender, ADDRESS).then(function(data) {
        var response = new fbTemplate.Text('Hi! Welcome to South Bend\'s Voting Chatbot. How can I help?');
        return response
            .addQuickReply('Polling Locations', PREFIX + 'pollingLocations1')
            .addQuickReply('Election Info', PREFIX + 'elections1')
            .get();
    }).catch(function(err) {
        console.log(err.message);
    });
}

// ask user for address
function getAddress(sender, state) {
    return persistCtx(sender, state).then(function(data) {
        var response = new fbTemplate.Text('What is your home address?');
        return response
            // .addQuickReplyLocation()
            .get();
    }).catch(function(err) {
        console.log(err.message);
        return null;
    });
}

// return polling locations near user
async function getLocations(sender, address) {
    return persistCtx(sender, INIT).then(async function(data) {
        var info = await ci.getInfo(address, ci.getLocationsData)
        return info;
    }).catch(function(err) {
        console.log(err.message);
        return errorOccurred();
    });
}

// return elections user can vote in
async function getElections(sender, address) {
    return persistCtx(sender, ELECTIONS_3).then(async function(data) {
        var elections = await ci.getInfo(address, ci.getElectionsData)
        const response = new fbTemplate.Generic();
        var count = 0;

        for (var office in elections) {
            if (count == 10) {
                break;
            }
            count += 1

            response.addBubble(office, "")
            response.addButton("View Candidates", PREFIX + elections[office] + "|||" + address)
        }

        return response.get();
    }).catch(function(err) {
        console.log(err.message);
        return errorOccurred();
    });
}

module.exports = botBuilder(async function (request) {
    var sender = request.type + '.' + request.sender;

    return restoreCtx(sender).then(async function(data) {
        var [text, userEntered] = getText(request);
        var state = extractState(text, data, userEntered)

        // handle based on state
        switch (state) {
            case INIT:
                return init(sender);
            case POLLING_LOCATIONS_1:
                return getAddress(sender, POLLING_LOCATIONS_2);
            case POLLING_LOCATIONS_2:
                var response = await getLocations(sender, text);
                return response;
            case ELECTIONS_1:
                return getAddress(sender, ELECTIONS_2);
            case ELECTIONS_2:
                var options = await getElections(sender, text);
                return options;
            case ELECTIONS_3:
                var [candidates, address] = text.split(DIVIDER);
                var options = await getElections(sender, address);

                return [candidates, options];
        }

    }).catch(function(err) {
        return persistCtx(sender, INIT).then(function(data) {
            return errorOccurred();
        });
    });
});
