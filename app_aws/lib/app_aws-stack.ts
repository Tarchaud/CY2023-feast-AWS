import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; 
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; 
import { join } from 'path';
import { AuthorizationType, CognitoUserPoolsAuthorizer, IdentitySource, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'; 
import { UserPool, UserPoolClient, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Role, PolicyStatement, Effect} from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";


export class AppAwsStack extends cdk.Stack {
  stocks : Table;
  eventsTb: Table;
  usersTb : Table;


  userPool: UserPool;
  userPoolClient: UserPoolClient;

  eventsAPI: RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, 'userPool', {
      selfSignUpEnabled: true, 
      signInAliases: { email: true }, 
      autoVerify: { email: true }, 
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      userVerification: {
        emailSubject: 'You need to verify your email',
        emailBody: 'Thanks for signing up Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
        requireUppercase: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const usersGroup =  new cognito.CfnUserPoolGroup(this, 'UserGroup', {
      userPoolId: this.userPool.userPoolId,

      description: 'role des user',
      groupName: 'UserGroup',
    });
    
    const orgsGroup = new cognito.CfnUserPoolGroup(this, 'OrgsGroup', {
      userPoolId: this.userPool.userPoolId,

      description: 'role des orga',
      groupName: 'OrgsGroup',
    });
    
    const adminsGroup = new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: this.userPool.userPoolId,

      description: 'role des admin',
      groupName: 'AdminsGroup',
    });
    


    this.userPoolClient = this.userPool.addClient("MyAppWebClient", {
      userPoolClientName: "MyAppWebClient",
      idTokenValidity: cdk.Duration.days(1),
      accessTokenValidity: cdk.Duration.days(1),
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {authorizationCodeGrant: true},
        scopes: [cognito.OAuthScope.OPENID]
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO]
    });

    this.userPoolClient.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Sortie des identifiants du pool d'utilisateurs et du client
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });

    const userDomain = new UserPoolDomain(this, 'userPoolDomain',{
      userPool : this.userPool,
      cognitoDomain: {
        domainPrefix: 'cyfeast'
      }
    });

    userDomain.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Extrait l'ID du pool d'utilisateurs Cognito
    const userPoolId = this.userPool.userPoolId;

    const userPoolClientID = this.userPoolClient.userPoolClientId;

    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [this.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    /**
     * Création des tables
     */
    /* Table Events */
    this.eventsTb = new Table(this, 'co_tableEvents', {
        partitionKey:{
        name:'event-id',
        type:AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName:'co_tableEvents',
      readCapacity:1,
      writeCapacity:1
    });

    /* Table Stocks */
    this.stocks = new Table(this, 'co_tableStocks', {
      partitionKey:{
        name:'stock-id',
        type:AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName:'co_tableStocks',
      readCapacity:1,
      writeCapacity:1
    });

    /* Table Users */
    this.usersTb = new Table(this, 'co_tableUsers', {
      partitionKey:{
        name:'user-id',
        type:AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName:'co_tableUsers',
      readCapacity:1,
      writeCapacity:1
    });



    /**
     * Création des lambdas pour les événements
     */
    const getEventsLambda = new NodejsFunction(this, 'getEvents', {
      memorySize: 128,
      description: "Appeler une liste d'événements",
      entry: join(__dirname, '../lambdas/events/getEventsLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const postEventLambda = new NodejsFunction(this, 'postEvents', {
      memorySize: 128,
      description: "Ajouter un événement",
      entry: join(__dirname, '../lambdas/event/postEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const putEventLambda = new NodejsFunction(this, 'putEvents', {
      memorySize: 128,
      description: "Modifier un événement",
      entry: join(__dirname, '../lambdas/event/putEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const deleteEventLambda = new NodejsFunction(this, 'deleteEvents', {
      memorySize: 128,
      description: "Supprimer un événement",
      entry: join(__dirname, '../lambdas/event/deleteEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const getEventLambda = new NodejsFunction(this, 'getEvent', {
      memorySize: 128,
      description: "Appeler un événement",
      entry: join(__dirname, '../lambdas/event/getEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    /* Donner des permissions à la lambda */
    this.eventsTb.grantReadWriteData(getEventsLambda);
    this.eventsTb.grantReadWriteData(postEventLambda);
    this.eventsTb.grantReadWriteData(putEventLambda);
    this.eventsTb.grantReadWriteData(deleteEventLambda);
    this.eventsTb.grantReadWriteData(getEventLambda);

    /**
     * Création des lambdas pour les stocks
     */
    const getStocksLambda = new NodejsFunction(this, 'getStocks', {
      memorySize: 128,
      description: "Appeler une liste de stocks",
      entry: join(__dirname, '../lambdas/stocks/getStocksLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const postStockLambda = new NodejsFunction(this, 'postStocks', {
      memorySize: 128,
      description: "Ajouter un stock",
      entry: join(__dirname, '../lambdas/stock/postStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const putStockLambda = new NodejsFunction(this, 'putStocks', {
      memorySize: 128,
      description: "Modifier un stock",
      entry: join(__dirname, '../lambdas/stock/putStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const deleteStockLambda = new NodejsFunction(this, 'deleteStocks', {
      memorySize: 128,
      description: "Supprimer un stock",
      entry: join(__dirname, '../lambdas/stock/deleteStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const getStockLambda = new NodejsFunction(this, 'getStock', {
      memorySize: 128,
      description: "Appeler un stock",
      entry: join(__dirname, '../lambdas/stock/getStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });


    /* Donner des permissions à la lambda */
    this.stocks.grantReadWriteData(getStocksLambda);
    this.stocks.grantReadWriteData(postStockLambda);
    this.stocks.grantReadWriteData(putStockLambda);
    this.stocks.grantReadWriteData(deleteStockLambda);
    this.stocks.grantReadWriteData(getStockLambda);

    /**
     * Création des lambdas pour les utilisateurs
     */
    const getUsersLambda = new NodejsFunction(this, 'getUsers', {
      memorySize: 128,
      description: "Appeler une liste d'utilisateurs",
      entry: join(__dirname, '../lambdas/users/getUsersLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const postUserLambda = new NodejsFunction(this, 'postUsers', {
      memorySize: 128,
      description: "Ajouter un utilisateur",
      entry: join(__dirname, '../lambdas/user/postUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName,
        USER_POOL_ID: userPoolId,
        USER_CLIENT_ID: userPoolClientID
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const loginUserLambda = new NodejsFunction(this, 'loginUser', {
      memorySize: 128,
      description: "Connexion d'un utilisateur",
      entry: join(__dirname, '../lambdas/user/loginUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName,
        USER_POOL_ID: userPoolId,
        USER_CLIENT_ID: userPoolClientID,        
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const putUserLambda = new NodejsFunction(this, 'putUsers', {
      memorySize: 128,
      description: "Modifier un utilisateur",
      entry: join(__dirname, '../lambdas/user/putUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName,
        USER_POOL_ID: userPoolId
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const deleteUserLambda = new NodejsFunction(this, 'deleteUsers', {
      memorySize: 128,
      description: "Supprimer un utilisateur",
      entry: join(__dirname, '../lambdas/user/deleteUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName,
        USER_POOL_ID: userPoolId
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const getUserLambda = new NodejsFunction(this, 'getUser', {
      memorySize: 128,
      description: "Appeler un utilisateur",
      entry: join(__dirname, '../lambdas/user/getUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    /** Donner des permissions à la lambda */
    this.usersTb.grantReadWriteData(getUsersLambda);
    this.usersTb.grantReadWriteData(postUserLambda);
    this.usersTb.grantReadWriteData(putUserLambda);
    this.usersTb.grantReadWriteData(deleteUserLambda);
    this.usersTb.grantReadWriteData(getUserLambda);
    this.usersTb.grantReadWriteData(loginUserLambda);

    /** Donner les permissions pour cognito */
    postUserLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup'],
      resources: [this.userPool.userPoolArn]
    }));

    loginUserLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:InitiateAuth'],
      resources: [this.userPool.userPoolArn]
    }));

    deleteUserLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:AdminDeleteUser'],
      resources: [this.userPool.userPoolArn]
    }));

    /**
     * Partie pour les inscriptions aux événements
     */

    const postRegistrationLambda = new NodejsFunction(this, 'postRegistration', {
      memorySize: 128,
      description: "Inscription à un événement",
      entry: join(__dirname, '../lambdas/registration/postRegistrationLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    const deleteRegistrationLambda = new NodejsFunction(this, 'deleteRegistration', {
      memorySize: 128,
      description: "Désinscription à un événement",
      entry: join(__dirname, '../lambdas/registration/deleteRegistrationLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
      runtime: Lambda.Runtime.NODEJS_18_X,
    });

    this.eventsTb.grantReadWriteData(postRegistrationLambda);
    this.eventsTb.grantReadWriteData(deleteRegistrationLambda);


    /**
     * Création de l'API Gateway
     */
    this.eventsAPI = new RestApi(this, 'cy-feast-api', {
      restApiName: 'Accéder aux événements',
      description: 'Gestion des événements depus le CY Feast'
    });

    //Intégration des lambdas events dans l'API
    const getEventsLambdaIntegration = new LambdaIntegration(getEventsLambda);
    const postEventLambdaIntegration = new LambdaIntegration(postEventLambda);
    const putEventLambdaIntegration = new LambdaIntegration(putEventLambda);
    const deleteEventLambdaIntegration = new LambdaIntegration(deleteEventLambda);
    const getEventLambdaIntegration = new LambdaIntegration(getEventLambda);

    /**
     * Création des ressources de l'API pour les méthodes sur les events
     */
    const apiEvents = this.eventsAPI.root.addResource('events');
    apiEvents.addMethod('GET', getEventsLambdaIntegration);
    apiEvents.addMethod('POST', postEventLambdaIntegration, {authorizer: cognitoAuthorizer});

    const apiEvent = apiEvents.addResource('{eventId}');
    apiEvent.addMethod('GET', getEventLambdaIntegration);
    apiEvent.addMethod('PUT', putEventLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiEvent.addMethod('DELETE', deleteEventLambdaIntegration, {authorizer : cognitoAuthorizer});


    //Intégration des lambdas registrations dans l'API
    const postRegistrationLambdaIntegration = new LambdaIntegration(postRegistrationLambda);
    const deleteRegistrationLambdaIntegration = new LambdaIntegration(deleteRegistrationLambda);
    
    /**
     * Création des ressources pour les inscriptions aux événements
     */
    const apiRegistration = apiEvents.addResource('registrations');
    const apiRegistrationEvent = apiRegistration.addResource('{eventId}');
    apiRegistrationEvent.addMethod('POST', postRegistrationLambdaIntegration), {authorizer : cognitoAuthorizer};
    apiRegistrationEvent.addMethod('DELETE', deleteRegistrationLambdaIntegration, {authorizer : cognitoAuthorizer});    


    //Intégration des lambdas stocks dans l'API
    const getStocksLambdaIntegration = new LambdaIntegration(getStocksLambda);
    const postStockLambdaIntegration = new LambdaIntegration(postStockLambda);
    const putStockLambdaIntegration = new LambdaIntegration(putStockLambda);
    const deleteStockLambdaIntegration = new LambdaIntegration(deleteStockLambda);
    const getStockLambdaIntegration = new LambdaIntegration(getStockLambda);

    /**
     * Création des ressources de l'API pour les méthodes sur les stocks
     */
    const apiStocks = this.eventsAPI.root.addResource('stocks');
    apiStocks.addMethod('GET', getStocksLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiStocks.addMethod('POST', postStockLambdaIntegration, {authorizer : cognitoAuthorizer});

    const apiStock = apiStocks.addResource('{stockId}');
    apiStock.addMethod('GET', getStockLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiStock.addMethod('PUT', putStockLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiStock.addMethod('DELETE', deleteStockLambdaIntegration, {authorizer : cognitoAuthorizer});


    //Intégration des lambdas users dans l'API
    const getUsersLambdaIntegration = new LambdaIntegration(getUsersLambda);
    const postUserLambdaIntegration = new LambdaIntegration(postUserLambda);
    const putUserLambdaIntegration = new LambdaIntegration(putUserLambda);
    const deleteUserLambdaIntegration = new LambdaIntegration(deleteUserLambda);
    const getUserLambdaIntegration = new LambdaIntegration(getUserLambda);
    const loginUserLambdaIntegration = new LambdaIntegration(loginUserLambda);

    /**
     * Création des ressources de l'API pour les méthodes sur les users
     */
    const apiUsers = this.eventsAPI.root.addResource('users');
    apiUsers.addMethod('GET', getUsersLambdaIntegration, {authorizer : cognitoAuthorizer});

    const apiUser = apiUsers.addResource('{userId}');
    apiUser.addMethod('GET', getUserLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiUser.addMethod('PUT', putUserLambdaIntegration, {authorizer : cognitoAuthorizer});
    apiUser.addMethod('DELETE', deleteUserLambdaIntegration, {authorizer : cognitoAuthorizer});

    const apiSignUp = apiUsers.addResource('signup');
    apiSignUp.addMethod('POST', postUserLambdaIntegration);

    const apiSignIn = apiUsers.addResource('login');
    apiSignIn.addMethod('POST', loginUserLambdaIntegration);

  }
}
