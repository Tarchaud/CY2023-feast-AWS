import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; //table dynamodb et les attributs de sa clé de partition
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; // Créer une lambda en nodejs
import { join } from 'path';
import { RestApi } from 'aws-cdk-lib/aws-apigateway'; // Créer une API Gateway

export class AppAwsStack extends cdk.Stack {
  eventsTb: Table;
  eventsAPI: RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    this.eventsTb = new Table(this, 'tableEvents', {
        partitionKey:{
        name:'event-id',
        type:AttributeType.STRING
      },
      tableName:'events-ala',
      readCapacity:1,
      writeCapacity:1
    });

    //créer une lambda
    const getEventsLambda = new NodejsFunction(this, 'getEvents', {
      memorySize: 128,
      description: "Appeler une liste d'événements",
      entry: join(__dirname, '../lambdas/getEventsLambda.ts'),
      environment: {
        TABLE : this.eventsTb.tableName
      },
    });

    //Donner des permissions à la lambda
    this.eventsTb.grantReadWriteData(getEventsLambda);

    //Créer une API Gateway
    this.eventsAPI = new RestApi(this, 'events-api', {
      restApiName: 'Accéder aux événements',
    });

    // example resource
    // const queue = new sqs.Queue(this, 'AppAwsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
