// For civic info
const API_KEY = "AIzaSyDJDVbMVYKXs15lWL77RI-xdSj4mSPofJA";
const BASE_URL = "https://www.googleapis.com/civicinfo/v2/voterinfo?key=";
const POLLING_LOCATIONS = "pollingLocations";
const ELECTIONS = "elections";
const CANDIDATE_URL = "candidateUrl";
const WEBSITE = "Website";
const NAME = "Name";
const STRING = "string";

const https = require('https');

// ---------------------------------- CIVIC INFO -------------------------------
function constructUrl(address) {
    const address_key = "&address="
    return BASE_URL + API_KEY + address_key + address
}

function formatAddress(address) {
    return address.replace(" ", "%20")
}

function title(str) {
    return str
        .toLowerCase()
        .trim()
        .split(' ')
        .map(function(word) {
            if (word[0] != '(') {
                return word[0].toUpperCase() + word.substr(1);
            } else {
                return word[0] + word[1].toUpperCase() + word.substr(2);
            }
        })
        .join(' ');
}

function formatInfoType(info_type) {
    switch(info_type) {
        case CANDIDATE_URL:
            return WEBSITE;
        default:
            return title(info_type);
    }
}

function formatInfo(info_type, info) {
    switch(info_type) {
        case NAME:
            return title(info);
        default:
            return info;
    }
}

function getElectionsData(resp) {
    var offices = {};

    contests = resp.contests

    for (var i in contests) {
        if (contests[i].office === undefined) {
            continue;
        }

        var str = "";
        for (var j in contests[i].candidates) {
            candidate = contests[i].candidates[j]

            for (var key in candidate) {
                if (typeof candidate[key] === STRING) {
                    var info_type = formatInfoType(key)
                    var info = formatInfo(info_type, candidate[key])
                    str += info_type + ": " + info + "\n";
                }
            }

            for (var k in candidate.channels) {
                var channel = candidate.channels[k]
                var info_type = formatInfoType(channel.type)

                str += info_type + ": "+ channel.id + "\n";
            }
            str += "\n";
        }

        offices[contests[i].office] = str;
    }

    return offices;
}

function getLocationsData(resp) {
    var str = ""

    locations = resp.pollingLocations
    if (locations.length == 0) {
        return "Sorry, there are no polling locations near you.";
    }

    str += "Polling Locations Near You:\n\n";

    for (var i in locations) {
        var address = locations[i].address
        str += "Name: " + address.locationName + "\n\n";
        str += "Address: " + [address.line1, address.city, address.state].join(',') + " " + address.zip + "\n\n";
        str += "Polling Hours: " + locations[i].pollingHours + "\n\n";
        str += "\n\n";
    }
    return str;
}

async function getRequest(url, fetch_data) {

    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                jsonResp = JSON.parse(data);
                resolve(fetch_data(jsonResp))
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    });
}

async function getInfo(raw_address, func) {
    var address = formatAddress(raw_address)
    var url = constructUrl(address)

    var response = await getRequest(url, func);
    return response;
}

module.exports = {getInfo, getLocationsData, getElectionsData}
