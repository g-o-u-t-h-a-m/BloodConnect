import { defineFunction } from '@aws-amplify/backend'

export const processBloodRequest = defineFunction({
    name: 'process-blood-request',
    timeoutSeconds: 30,
})