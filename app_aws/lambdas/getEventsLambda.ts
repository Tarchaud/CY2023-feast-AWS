import * as AWS from 'aws-sdk';


const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async(event:any) => {

    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.httpMethod) {
            case 'DELETE':
                body = await db.delete(JSON.parse(event.body));
                break;
            case 'GET':
                body = await db.scan({ TableName: event.queryStringParameters.TableName });
                break;
            case 'POST':
                body = await db.put(JSON.parse(event.body));
                break;
            case 'PUT':
                body = await db.update(JSON.parse(event.body));
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err:any) {
        statusCode = 400;
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
}