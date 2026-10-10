import { defineFunction } from '@aws-amplify/backend'

export const startBloodProcessing = defineFunction({
  name: 'start-blood-processing',
  resourceGroupName: 'data',
  timeoutSeconds: 10,
  environment: {
    STATE_MACHINE_ARN: '',
  },
})
