var AWS = require('aws-sdk');
//const dynamodb = new AWS.DynamoDB.DocumentClient();

AWS.config.update({region:'us-east-1'});


var dynamodb = new AWS.DynamoDB();

const tableName = 'voting_info';

function restoreCtx(sender)//Function will be used later to restore database information for the user that accesses the bot.
{
    console.log("Trying to restore context for sender", sender);

    var params = {
        TableName: tableName,
        Key : {
            "id" : {
                "S" : sender
            }
        }
    };

    return dynamodb.getItem(params, function(err, data) {
        if (err) {
            return null; // an error occurred
        } else {
            return data.Item.State.S; // successful response
        }
    });
}

async function persistCtx(sender, state) // This is used later to repopulate the database with user information
{
  console.log("Persisting context for sender", sender);

  var params = {
      TableName: tableName,
      Item: {
          id: {
              S: sender
          },
          State: {
              S: state
          }
      }
  };

    console.log("IS THIS IT")

    var putObjectPromise = dynamodb.putItem(params).promise();

    putObjectPromise.then(function(data) {
        return "Success"
    }).catch(function(err) {
        return "err"
    });

    // dynamodb.putItem(params, function(err, data){
    //     if (err) {
    //         console.log(":(")
    //         console.log(err.message); // an error occurred
    //         return err.message
    //     } else {
    //         return "yes1"
    //     }
    // });

    console.log("Items are succesfully ingested in table ..................");

}

function check() {
    try {
        console.log("TRYING")
        console.log(persistCtx('facebook.2163978690301326', "init"));
    } catch (err) {
        console.log("FAILED YO: " + err.message)
    }

}

check()
