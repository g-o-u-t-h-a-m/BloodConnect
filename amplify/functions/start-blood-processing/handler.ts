import {
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn'

import { env } from '$amplify/env/start-blood-processing'

const sfnClient = new SFNClient({})

type Event = {
  arguments?: {
    bloodRequestId?: string
  }
}

export const handler = async (event: Event) => {
  const bloodRequestId = event.arguments?.bloodRequestId

  if (!bloodRequestId) {
    throw new Error('bloodRequestId is required.')
  }

  if (!env.STATE_MACHINE_ARN) {
    throw new Error('STATE_MACHINE_ARN is not configured.')
  }

  const execution = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: env.STATE_MACHINE_ARN,
      input: JSON.stringify({
        bloodRequestId,
      }),
    }),
  )

  console.log('Started BloodConnect workflow:', {
    bloodRequestId,
    executionArn: execution.executionArn,
  })

  return {
    success: true,
    bloodRequestId,
    executionArn: execution.executionArn,
    message: 'Blood processing workflow started.',
  }
}
