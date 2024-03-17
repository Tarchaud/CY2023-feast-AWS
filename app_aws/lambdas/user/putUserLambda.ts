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
            case 'PUT':
                /** Partie pour changer de pool si nécéssaire */
                const user = await db.scan({ TableName, Key: { "user-id": userId } });
                let tmpBody = JSON.parse(event.body);
                let role = user.Items[0].role;
                let email = user.Items[0].email;

                //si le role a été modifié alors on change de pool
                if (role !== tmpBody.role) {
                    
                    let poolId;
                    switch (role) {
                        case "admin":
                            poolId = ADMIN_POOL_ID;
                            break;
                        case "orga":
                            poolId = ORGA_POOL_ID;
                            break;
                        default:
                            poolId = USER_POOL_ID;
                    }
                    //on supprime le user de l'ancienne pool
                    const cognito = new AWS.CognitoIdentityServiceProvider();
                    const params = {
                        UserPoolId: poolId!, 
                        Username: email,
                    };

                    const data = await cognito.adminDeleteUser(params).promise();
                    console.log('User deleted successfully:', data);

                    //on ajoute le user à la nouvelle pool
                    let newPoolId;
                    switch (JSON.parse(event.body).role) {
                        case "admin":
                            newPoolId = ADMIN_POOL_ID;
                            break;
                        case "orga":
                            newPoolId = ORGA_POOL_ID;
                            break;
                        default:
                            newPoolId = USER_POOL_ID;
                    }
                    const newParams = {
                        UserPoolId: newPoolId!, 
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
                    console.log("params", newParams);

                    const newData = await cognito.adminCreateUser(newParams).promise();
                    console.log('User added successfully:', newData);
                }


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