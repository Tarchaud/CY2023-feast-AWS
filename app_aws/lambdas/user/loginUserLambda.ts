import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'; 
import CognitoIdentityServiceProvider = require('aws-sdk/clients/cognitoidentityserviceprovider');

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_CLIENT_ID = process.env.USER_CLIENT_ID;

export const handler = async (event : any) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    const client = new CognitoIdentityProviderClient({});

    let data;

    try {
        switch (event.requestContext.httpMethod) {
            case 'POST':
                const tmpBody = JSON.parse(event.body);
                const paramsAuth = {
                        AuthFlow: 'USER_PASSWORD_AUTH', 
                        ClientId: USER_CLIENT_ID!, 
                        UserPoolId: USER_POOL_ID!, 
                        AuthParameters: {
                            USERNAME: tmpBody.username,
                            PASSWORD: tmpBody.password,
                        },
                };

                const dataAuth = await client.send(new InitiateAuthCommand(paramsAuth));
                const token = dataAuth.AuthenticationResult?.IdToken;
                console.log('token:', token);
                body = {"token" : token };
            break;
            default:
                throw new Error(`Unsupported method "${event.requestContext.httpMethod}"`);
        }
    } catch (err : any) {
            statusCode = err.statusCode || 500; 
            body = { error: err.message, "data": data };
        } finally {
            body = JSON.stringify(body);
        }

    return {
        statusCode,
        body,
        headers,
    };
}