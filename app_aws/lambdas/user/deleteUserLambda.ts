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
        const userId = event.pathParameters.userId;
        switch (event.requestContext.httpMethod) {
            case 'DELETE': 
                /** Partie suppression du user dans la pool */
                const user = await db.get({ TableName, Key: { "user-id": userId } });
                let poolId;
                switch (user.Item.role) {
                    case "admin":
                        poolId = ADMIN_POOL_ID;
                        break;
                    case "orga":
                        poolId = ORGA_POOL_ID;
                        break;
                    default:
                        poolId = USER_POOL_ID;
                }

                const cognito = new AWS.CognitoIdentityServiceProvider();
                const params = {
                    UserPoolId: poolId!, 
                    Username: user.Item.email,
                };
                const data = await cognito.adminDeleteUser(params).promise();
                console.log('User deleted successfully:', data);

                /** Partie suppression du user dans la DB */
                body = await db.delete({ TableName, Key: { "user-id": userId } });
                body = {"msg" : "user deleted"}
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