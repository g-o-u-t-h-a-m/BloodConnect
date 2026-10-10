import {
  type ClientSchema,
  a,
  defineData,
} from '@aws-amplify/backend'

import { processBloodRequest } from '../functions/process-blood-request/resource'
import { startBloodProcessing } from '../functions/start-blood-processing/resource'

const schema = a.schema({
  Hospital: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      hospitalType: a.string(),
      registrationNumber: a.string(),
      contactPerson: a.string(),
      address: a.string(),
      location: a.string().required(),
      pincode: a.string(),
      verificationStatus: a.string(),
      bloodRequests: a.hasMany('BloodRequest', 'hospitalId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read', 'update']),
      allow.group('HOSPITALS').to(['create', 'read', 'update']),
      allow.owner().to(['create', 'read', 'update']),
      allow.group('BLOOD_BANKS').to(['read']),
      allow.group('DONORS').to(['read']),
    ]),

  BloodBank: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      registrationNumber: a.string(),
      licenseNumber: a.string(),
      licenseValidUntil: a.string(),
      category: a.string(),
      contactPerson: a.string(),
      address: a.string(),
      location: a.string().required(),
      pincode: a.string(),
      componentFacility: a.boolean(),
      apheresisFacility: a.boolean(),
      verificationStatus: a.string(),
      inventory: a.hasMany('Inventory', 'bloodBankId'),
      bloodRequests: a.hasMany('BloodRequest', 'bloodBankId'),
      donations: a.hasMany('Donation', 'bloodBankId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read', 'update']),
      allow.group('HOSPITALS').to(['read']),
      allow.group('BLOOD_BANKS').to(['create', 'read', 'update']),
      allow.owner().to(['create', 'read', 'update']),
      allow.group('DONORS').to(['read']),
    ]),

  Donor: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      dateOfBirth: a.string(),
      gender: a.string(),
      bloodGroup: a.string().required(),
      address: a.string(),
      location: a.string().required(),
      pincode: a.string(),
      emergencyContactName: a.string(),
      emergencyContactPhone: a.string(),
      donationStatus: a.string().required(),
      availability: a.string(),
      accountStatus: a.string(),
      donations: a.hasMany('Donation', 'donorId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read']),
      allow.group('HOSPITALS').to(['read']),
      allow.group('BLOOD_BANKS').to(['read', 'update']),
      allow.group('DONORS').to(['create', 'read', 'update']),
      allow.owner().to(['create', 'read', 'update']),
    ]),

  Inventory: a
    .model({
      bloodGroup: a.string().required(),
      availableUnits: a.integer().required(),
      threshold: a.integer().required(),
      bloodBankId: a.id().required(),
      bloodBank: a.belongsTo('BloodBank', 'bloodBankId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read']),
      // Current frontend completes an immediately-fulfillable hospital request
      // by updating the selected blood-bank inventory. This permission is kept
      // for the current client workflow; move this mutation to a backend
      // function before production hardening.
      allow.group('HOSPITALS').to(['read', 'update']),
      allow.group('BLOOD_BANKS').to(['create', 'read', 'update']),
      allow.group('DONORS').to(['read']),
    ]),

  BloodRequest: a
    .model({
      bloodGroup: a.string().required(),
      unitsRequired: a.integer().required(),
      initialAvailable: a.integer().required(),
      shortageUnits: a.integer().required(),
      status: a.string().required(),
      message: a.string().required(),
      location: a.string().required(),
      hospitalId: a.id().required(),
      hospital: a.belongsTo('Hospital', 'hospitalId'),
      bloodBankId: a.id().required(),
      bloodBank: a.belongsTo('BloodBank', 'bloodBankId'),
      donations: a.hasMany('Donation', 'bloodRequestId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read']),
      allow.group('HOSPITALS').to(['create', 'read']),
      allow.group('BLOOD_BANKS').to(['read', 'update']),
      allow.group('DONORS').to(['read']),
    ]),

  Donation: a
    .model({
      status: a.string().required(),
      donorId: a.id().required(),
      donor: a.belongsTo('Donor', 'donorId'),
      bloodRequestId: a.id().required(),
      bloodRequest: a.belongsTo('BloodRequest', 'bloodRequestId'),
      bloodBankId: a.id().required(),
      bloodBank: a.belongsTo('BloodBank', 'bloodBankId'),
    })
    .authorization(allow => [
      allow.group('ADMINS').to(['read']),
      allow.group('HOSPITALS').to(['read']),
      allow.group('BLOOD_BANKS').to(['create', 'read', 'update']),
      allow.group('DONORS').to(['create', 'read']),
    ]),
  startBloodRequestProcessing: a
    .mutation()
    .arguments({
      bloodRequestId: a.id().required(),
    })
    .returns(a.json())
    .authorization(allow => [
      allow.group('HOSPITALS'),
      allow.group('BLOOD_BANKS'),
    ])
    .handler(
      a.handler.function(startBloodProcessing),
    ),
})
  .authorization(allow => [
    allow.resource(processBloodRequest),
  ])

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})