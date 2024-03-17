import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async(event : any) => {

    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const userId = event.pathParameters.userId;
        switch (event.requestContext.httpMethod) {
            case 'GET':
                body = await db.scan({ TableName, Key: { "user-id": userId } });
                body = body.Items[0];
                break;
            default:
                throw new Error(`Unsupported method "${event.requestContext.httpMethod}"`);
        }
    } catch (err : any) {
        statusCode = err.statusCode || 500; 
        body = { error: err.message };
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
}