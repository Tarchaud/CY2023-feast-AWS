import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'; //table dynamodb et les attributs de sa clé de partition
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; // Créer une lambda en nodejs
import { join } from 'path';

export class AppAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const tb = new Table(this, 'tableEvents', {
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
        TABLE : tb.tableName
      },
    });

    // example resource
    // const queue = new sqs.Queue(this, 'AppAwsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
