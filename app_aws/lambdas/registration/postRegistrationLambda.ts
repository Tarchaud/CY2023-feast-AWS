import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE; 

export const handler = async (event : any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const eventId = event.pathParameters.eventId;
        switch (event.requestContext.httpMethod) {
            case 'POST': 
                /** Partie ajout de la registration */
                let eventdb = await db.scan({ TableName, Key: { "event-id": eventId } });
                eventdb = eventdb.Items[0];

                let registrations = eventdb.registrations;
                if (!registrations) {
                    registrations = [];
                }
                let tmpBody = JSON.parse(event.body);
                
                registrations.push(tmpBody.user_id);


                /** Partie mise à jour de l'event */
                eventdb.registrations = registrations;
                body = await db.put({ TableName, Item: eventdb });

                body = {"msg" : "registration add", "event-id" : eventId, "event": eventdb};
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