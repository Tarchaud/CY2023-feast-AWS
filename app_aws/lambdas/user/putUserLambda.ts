import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as AWS from 'aws-sdk';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE; 
const USER_POOL_ID = process.env.USER_POOL_ID;

export const handler = async (event : any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const userId = event.pathParameters.userId;
        switch (event.requestContext.httpMethod) {
            case 'PUT':
                /** Partie on update le user dans la db  */
                const item = { ...JSON.parse(event.body), "user-id": userId };
                body = await db.put({ TableName, Item: item });
                body = { "user-id" : userId };
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
};