import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;

exports.handler = async(event : any) => {

    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const stockId = event.pathParameters.stockId;
        switch (event.requestContext.httpMethod) {
            case 'GET':
                let token = event.headers.Authorization;

                if (token.startsWith('Bearer ')) {
                    token = token.slice(7, token.length);
                }
        
                const claims = jwt.decode(token) as jwt.JwtPayload;
        
                if (!claims || !(claims['custom:role'] && (claims['custom:role'].includes('orga') || claims['custom:role'].includes('admin')))) {
                    throw { statusCode: 403, message: 'Access denied.'};
                }

                body = await db.scan({ TableName, Key: { "stock-id": stockId } });
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