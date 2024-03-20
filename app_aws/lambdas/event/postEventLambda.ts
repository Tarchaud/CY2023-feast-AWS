import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE; 

export const handler = async (event : any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.requestContext.httpMethod) {
            case 'POST':
                let token = event.headers.Authorization;

                if (token.startsWith('Bearer ')) {
                    token = token.slice(7, token.length);
                }
        
                const claims = jwt.decode(token) as jwt.JwtPayload;
        
                if (!claims || !(claims['custom:role'] && (claims['custom:role'].includes('orga') || claims['custom:role'].includes('admin')))) {
                    throw { statusCode: 403, message: 'Access denied.'};
                }

                const eventId = uuidv4();
                // Ajouter la clé event-id à l'objet JSON
                const item = { ...JSON.parse(event.body), "event-id": eventId };
                body = await db.put({ TableName, Item: item });
                body = { "event-id" : eventId };
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