import { defineAuth } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  groups: [
    'HOSPITALS',
    'BLOOD_BANKS',
    'DONORS',
    'ADMINS',
  ],
})