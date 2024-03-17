import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as AWS from 'aws-sdk';

const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;
const USER_POOL_ID = process.env.USER_POOL_ID;
const ORGA_POOL_ID = process.env.ORGA_POOL_ID;
const ADMIN_POOL_ID = process.env.ADMIN_POOL_ID;

export const handler = async (event : any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.requestContext.httpMethod) {
            case 'POST':
                /** Partie enregistrement dans la pool */
                const cognito = new AWS.CognitoIdentityServiceProvider();
                const tmpBody = JSON.parse(event.body);
                let poolId = USER_POOL_ID;
                switch (tmpBody.role) {
                    case "admin":
                        poolId = ADMIN_POOL_ID;
                        break;
                    case "orga":
                        poolId = ORGA_POOL_ID;
                        break;
                    default:
                        poolId = USER_POOL_ID;
                }

                const params = {
                    UserPoolId: poolId!, 
                    Username: tmpBody.email,
                    DesiredDeliveryMediums: ['EMAIL'],
                    TemporaryPassword: event.body.password,
                    UserAttributes: [
                    {
                        Name: 'email',
                        Value: tmpBody.email,
                    },
                    ],
                };
                console.log("params", params);

                const data = await cognito.adminCreateUser(params).promise();
                console.log('User added successfully:', data);

                /** Partie enregistrement dans la DB */
                const userId = data.User ? data.User.Username : undefined;
                let user = JSON.parse(event.body);
                delete user.password;
                const item = { ...user, "user-id": userId };
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