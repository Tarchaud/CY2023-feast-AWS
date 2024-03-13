import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; //table dynamodb et les attributs de sa clé de partition
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; // Créer une lambda en nodejs
import { join } from 'path';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'; // Créer une API Gateway
import * as s3 from 'aws-cdk-lib/aws-s3';

export class AppAwsStack extends cdk.Stack {
  stocks : Table;
  eventsTb: Table;
  usersTb : Table;

  bucket  : s3.Bucket;

  eventsAPI: RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Création du bucket pour les imgs
    this.bucket = new s3.Bucket(this, 'co_bucket', {
      versioned: true, 
      removalPolicy: cdk.RemovalPolicy.DESTROY // Détruire le bucket lors de la suppression de la stack
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
    });

    const postEventLambda = new NodejsFunction(this, 'postEvents', {
      memorySize: 128,
      description: "Ajouter un événement",
      entry: join(__dirname, '../lambdas/event/postEventLambda.ts'),
      environment: {
        BUCKET_NAME: this.bucket.bucketName,
        TABLE : this.eventsTb.tableName
      },
    });

    const putEventLambda = new NodejsFunction(this, 'putEvents', {
      memorySize: 128,
      description: "Modifier un événement",
      entry: join(__dirname, '../lambdas/event/putEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    const deleteEventLambda = new NodejsFunction(this, 'deleteEvents', {
      memorySize: 128,
      description: "Supprimer un événement",
      entry: join(__dirname, '../lambdas/event/deleteEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    const getEventLambda = new NodejsFunction(this, 'getEvent', {
      memorySize: 128,
      description: "Appeler un événement",
      entry: join(__dirname, '../lambdas/event/getEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    /* Donner des permissions à la lambda */
    this.eventsTb.grantReadWriteData(getEventsLambda);
    this.eventsTb.grantReadWriteData(postEventLambda);
    this.eventsTb.grantReadWriteData(putEventLambda);
    this.eventsTb.grantReadWriteData(deleteEventLambda);
    this.eventsTb.grantReadWriteData(getEventLambda);

    this.bucket.grantReadWrite(postEventLambda);


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
    });

    const postStockLambda = new NodejsFunction(this, 'postStocks', {
      memorySize: 128,
      description: "Ajouter un stock",
      entry: join(__dirname, '../lambdas/stock/postStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
    });

    const putStockLambda = new NodejsFunction(this, 'putStocks', {
      memorySize: 128,
      description: "Modifier un stock",
      entry: join(__dirname, '../lambdas/stock/putStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
    });

    const deleteStockLambda = new NodejsFunction(this, 'deleteStocks', {
      memorySize: 128,
      description: "Supprimer un stock",
      entry: join(__dirname, '../lambdas/stock/deleteStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
    });

    const getStockLambda = new NodejsFunction(this, 'getStock', {
      memorySize: 128,
      description: "Appeler un stock",
      entry: join(__dirname, '../lambdas/stock/getStockLambda.ts'),
      environment: {
        TABLE : this.stocks.tableName
      },
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
    });

    const postUserLambda = new NodejsFunction(this, 'postUsers', {
      memorySize: 128,
      description: "Ajouter un utilisateur",
      entry: join(__dirname, '../lambdas/user/postUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
    });

    const putUserLambda = new NodejsFunction(this, 'putUsers', {
      memorySize: 128,
      description: "Modifier un utilisateur",
      entry: join(__dirname, '../lambdas/user/putUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
    });

    const deleteUserLambda = new NodejsFunction(this, 'deleteUsers', {
      memorySize: 128,
      description: "Supprimer un utilisateur",
      entry: join(__dirname, '../lambdas/user/deleteUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
    });

    const getUserLambda = new NodejsFunction(this, 'getUser', {
      memorySize: 128,
      description: "Appeler un utilisateur",
      entry: join(__dirname, '../lambdas/user/getUserLambda.ts'),
      environment: {
        TABLE : this.usersTb.tableName
      },
    });

    /* Donner des permissions à la lambda */
    this.usersTb.grantReadWriteData(getUsersLambda);
    this.usersTb.grantReadWriteData(postUserLambda);
    this.usersTb.grantReadWriteData(putUserLambda);
    this.usersTb.grantReadWriteData(deleteUserLambda);
    this.usersTb.grantReadWriteData(getUserLambda);



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
    apiEvents.addMethod('POST', postEventLambdaIntegration);

    const apiEvent = apiEvents.addResource('{eventId}');
    apiEvent.addMethod('GET', getEventLambdaIntegration);
    apiEvent.addMethod('PUT', putEventLambdaIntegration);
    apiEvent.addMethod('DELETE', deleteEventLambdaIntegration);


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
    apiStocks.addMethod('GET', getStocksLambdaIntegration);
    apiStocks.addMethod('POST', postStockLambdaIntegration);

    const apiStock = apiStocks.addResource('{stockId}');
    apiStock.addMethod('GET', getStockLambdaIntegration);
    apiStock.addMethod('PUT', putStockLambdaIntegration);
    apiStock.addMethod('DELETE', deleteStockLambdaIntegration);

    //Intégration des lambdas users dans l'API
    const getUsersLambdaIntegration = new LambdaIntegration(getUsersLambda);
    const postUserLambdaIntegration = new LambdaIntegration(postUserLambda);
    const putUserLambdaIntegration = new LambdaIntegration(putUserLambda);
    const deleteUserLambdaIntegration = new LambdaIntegration(deleteUserLambda);
    const getUserLambdaIntegration = new LambdaIntegration(getUserLambda);

    /**
     * Création des ressources de l'API pour les méthodes sur les users
     */
    const apiUsers = this.eventsAPI.root.addResource('users');
    apiUsers.addMethod('GET', getUsersLambdaIntegration);
    apiUsers.addMethod('POST', postUserLambdaIntegration);

    const apiUser = apiUsers.addResource('{userId}');
    apiUser.addMethod('GET', getUserLambdaIntegration);
    apiUser.addMethod('PUT', putUserLambdaIntegration);
    apiUser.addMethod('DELETE', deleteUserLambdaIntegration);


    

    

  }
}
