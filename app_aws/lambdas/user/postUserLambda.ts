import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider'; 


const db = DynamoDBDocument.from(new DynamoDB());
const TableName = process.env.TABLE;
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_CLIENT_ID = process.env.USER_CLIENT_ID;

const cognitoIdentityServiceProvider = new CognitoIdentityProviderClient({});

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
                const tmpBody = JSON.parse(event.body);
                let UserGroup = "UserGroup";
                switch (tmpBody.role) {
                    case "admin":
                        UserGroup = "AdminGroup";
                        break;
                    case "orga":
                        UserGroup = "OrgaGroup";
                        break;
                    default:
                        UserGroup = "UserGroup";
                }

                let role 
                if(tmpBody.role && ["admin", "orga", "user"].includes(tmpBody.role)){
                    role = tmpBody.role;
                }else{
                    role = "user";
                }

                const result = await cognitoIdentityServiceProvider.send(
                    new SignUpCommand({
                        ClientId: USER_CLIENT_ID!,
                        Username: tmpBody.email,
                        Password: tmpBody.password,
                        UserAttributes: [
                            {
                                Name: 'email',
                                Value: tmpBody.email,
                            },
                            {
                                Name: 'custom:role',
                                Value: tmpBody.role,
                            }
                        ],
                    }),
                );

                /** Ajouter l'utilisateur au groupe */ 
                // const addUserToGroupParams = {
                //     UserPoolId: USER_CLIENT_ID!,
                //     Username: tmpBody.email,
                //     GroupName: UserGroup,
                // };
                // cognitoIdentityServiceProvider.adminAddUserToGroup(addUserToGroupParams, (err :any , data:any) => {
                //     if (err) {
                //       console.error('Error adding user to group:', err);
                //     } else {
                //       console.log('User added to group successfully:', data);
                //     }
                //   });
    
                /** Partie enregistrement dans la DB */
                const userId = result.UserSub;
                let user = JSON.parse(event.body);
                delete user.password;
                const item = { ...user, "user-id": userId };
                await db.put({ TableName, Item: item });


                body = { "user-id" : userId};
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