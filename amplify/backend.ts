import { defineBackend } from '@aws-amplify/backend'

import { auth } from './auth/resource'
import { data } from './data/resource'

import { processBloodRequest } from './functions/process-blood-request/resource'
import { startBloodProcessing } from './functions/start-blood-processing/resource'

import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'

const backend = defineBackend({
  auth,
  data,
  processBloodRequest,
  startBloodProcessing,
})

const workflowStack = backend.createStack(
  'BloodConnectProcessingWorkflow',
)

const processBloodRequestTask =
  new tasks.LambdaInvoke(
    workflowStack,
    'ProcessBloodRequest',
    {
      lambdaFunction:
        backend.processBloodRequest.resources.lambda,
      payloadResponseOnly: true,
    },
  )

const workflowSuccess =
  new sfn.Succeed(
    workflowStack,
    'ProcessingCompleted',
  )

processBloodRequestTask.next(
  workflowSuccess,
)

const stateMachine =
  new sfn.StateMachine(
    workflowStack,
    'BloodConnectProcessingStateMachine',
    {
      stateMachineName:
        'BloodConnectProcessingWorkflow',
      definitionBody:
        sfn.DefinitionBody.fromChainable(
          processBloodRequestTask,
        ),
    },
  )

backend.startBloodProcessing.addEnvironment(
  'STATE_MACHINE_ARN',
  stateMachine.stateMachineArn,
)

stateMachine.grantStartExecution(
  backend.startBloodProcessing.resources.lambda,
)
