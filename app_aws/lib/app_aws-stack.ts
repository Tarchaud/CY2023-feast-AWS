import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; //table dynamodb et les attributs de sa clé de partition
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; // Créer une lambda en nodejs
import { join } from 'path';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'; // Créer une API Gateway

export class AppAwsStack extends cdk.Stack {
  stocks : Table;
  eventsTb: Table;
  usersTb : Table;

  eventsAPI: RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Création des tables
     */
    /* Table Events */
    this.eventsTb = new Table(this, 'co_tableEvents', {
        partitionKey:{
        name:'event-id',
        type:AttributeType.STRING
      },
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

    const postEventsLambda = new NodejsFunction(this, 'postEvents', {
      memorySize: 128,
      description: "Ajouter un événement",
      entry: join(__dirname, '../lambdas/event/postEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    const putEventsLambda = new NodejsFunction(this, 'putEvents', {
      memorySize: 128,
      description: "Modifier un événement",
      entry: join(__dirname, '../lambdas/event/putEventLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    const deleteEventsLambda = new NodejsFunction(this, 'deleteEvents', {
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
    this.eventsTb.grantReadWriteData(postEventsLambda);
    this.eventsTb.grantReadWriteData(putEventsLambda);
    this.eventsTb.grantReadWriteData(deleteEventsLambda);
    this.eventsTb.grantReadWriteData(getEventLambda);

    /**
     * Création de l'API Gateway
     */
    this.eventsAPI = new RestApi(this, 'events-api', {
      restApiName: 'Accéder aux événements',
      description: 'Gestion des événements depus le CY Feast'
    });

    //Intégration de la lambda pour la connecter à une méthode de l'API
    const getEventsLambdaIntegration = new LambdaIntegration(getEventsLambda);
    const postEventsLambdaIntegration = new LambdaIntegration(postEventsLambda);
    const putEventsLambdaIntegration = new LambdaIntegration(putEventsLambda);
    const deleteEventsLambdaIntegration = new LambdaIntegration(deleteEventsLambda);
    const getEventLambdaIntegration = new LambdaIntegration(getEventLambda);

    /**
     * Création des ressources de l'API pour les méthodes sur les events
     */
    const apiEvents = this.eventsAPI.root.addResource('events');
    apiEvents.addMethod('GET', getEventsLambdaIntegration);
    apiEvents.addMethod('POST', postEventsLambdaIntegration);

    //mettre l'id de l'événement dans l'url
    const apiEvent = apiEvents.addResource('{eventId}');
    apiEvent.addMethod('GET', getEventLambdaIntegration);
    apiEvent.addMethod('PUT', putEventsLambdaIntegration);
    apiEvent.addMethod('DELETE', deleteEventsLambdaIntegration);

  }
}
