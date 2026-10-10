import type { Handler } from 'aws-lambda'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { env } from '$amplify/env/process-blood-request'

import type { Schema } from '../../data/resource'

const { resourceConfig, libraryOptions } =
    await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const client = generateClient<Schema>()

type ProcessEvent = {
    action?: string
    bloodRequestId?: string
}

export const handler: Handler = async (event: ProcessEvent) => {
    console.log('processBloodRequest event:', JSON.stringify(event))

    if (!event?.bloodRequestId) {
        throw new Error('bloodRequestId is required.')
    }

    const bloodRequestId = event.bloodRequestId

    // ---------------------------------------------------------
    // 1. GET BLOOD REQUEST
    // ---------------------------------------------------------

    const { data: request, errors: requestErrors } =
        await client.models.BloodRequest.get({
            id: bloodRequestId,
        })

    if (requestErrors?.length) {
        console.error('BloodRequest lookup errors:', requestErrors)
        throw new Error(
            requestErrors.map(error => error.message).join('; '),
        )
    }

    if (!request) {
        throw new Error(`Blood request ${bloodRequestId} was not found.`)
    }

    console.log('Blood request:', request)

    // Already fulfilled → do nothing.
    if (request.status === 'FULFILLED') {
        return {
            requestId: request.id,
            bloodGroup: request.bloodGroup,
            requiredUnits: request.unitsRequired,
            availableUnits: 0,
            allocatedUnits: request.unitsRequired,
            remainingInventory: 0,
            shortageUnits: 0,
            status: 'FULFILLED',
            message: 'Request was already fulfilled.',
        }
    }

    // ---------------------------------------------------------
    // 2. GET MATCHING INVENTORY
    // ---------------------------------------------------------

    const { data: inventories, errors: inventoryErrors } =
        await client.models.Inventory.list({
            filter: {
                bloodBankId: {
                    eq: request.bloodBankId,
                },
            },
        } as any)

    if (inventoryErrors?.length) {
        console.error('Inventory lookup errors:', inventoryErrors)
        throw new Error(
            inventoryErrors.map(error => error.message).join('; '),
        )
    }

    const inventory = inventories?.find(
        item => item.bloodGroup === request.bloodGroup,
    )

    if (!inventory) {
        throw new Error(
            `No ${request.bloodGroup} inventory exists for blood bank ${request.bloodBankId}.`,
        )
    }

    // ---------------------------------------------------------
    // 3. CALCULATE
    // ---------------------------------------------------------

    const requiredUnits = Number(request.unitsRequired)
    const availableUnits = Number(inventory.availableUnits)

    console.log({
        bloodGroup: request.bloodGroup,
        requiredUnits,
        availableUnits,
    })

    // ---------------------------------------------------------
    // 4A. ENOUGH BLOOD → FULFILL REQUEST
    // ---------------------------------------------------------

    if (availableUnits >= requiredUnits) {
        const remainingInventory = availableUnits - requiredUnits

        const { data: updatedInventory, errors: updateInventoryErrors } =
            await client.models.Inventory.update({
                id: inventory.id,
                bloodGroup: inventory.bloodGroup,
                availableUnits: remainingInventory,
                threshold: inventory.threshold,
                bloodBankId: inventory.bloodBankId,
            } as any)

        if (updateInventoryErrors?.length || !updatedInventory) {
            console.error(
                'Inventory update errors:',
                updateInventoryErrors,
            )

            throw new Error(
                updateInventoryErrors?.map(error => error.message).join('; ') ??
                'Inventory update failed.',
            )
        }

        const { data: updatedRequest, errors: updateRequestErrors } =
            await client.models.BloodRequest.update({
                id: request.id,
                bloodGroup: request.bloodGroup,
                unitsRequired: request.unitsRequired,
                initialAvailable: request.initialAvailable,
                shortageUnits: 0,
                status: 'FULFILLED',
                message: `Request fulfilled automatically. ${requiredUnits} unit(s) allocated from blood bank inventory.`,
                location: request.location,
                hospitalId: request.hospitalId,
                bloodBankId: request.bloodBankId,
            } as any)

        if (updateRequestErrors?.length || !updatedRequest) {
            console.error(
                'BloodRequest update errors:',
                updateRequestErrors,
            )

            throw new Error(
                updateRequestErrors?.map(error => error.message).join('; ') ??
                'Blood request update failed.',
            )
        }

        console.log('REQUEST FULFILLED')

        return {
            requestId: request.id,
            bloodGroup: request.bloodGroup,
            requiredUnits,
            availableUnits,
            allocatedUnits: requiredUnits,
            remainingInventory,
            shortageUnits: 0,
            status: 'FULFILLED',
            message: 'Blood request fulfilled from inventory.',
        }
    }

    // ---------------------------------------------------------
    // 4B. NOT ENOUGH BLOOD → DONOR SUPPORT
    // ---------------------------------------------------------

    const shortageUnits = requiredUnits - availableUnits

    const { data: updatedRequest, errors: updateRequestErrors } =
        await client.models.BloodRequest.update({
            id: request.id,
            bloodGroup: request.bloodGroup,
            unitsRequired: request.unitsRequired,
            initialAvailable: request.initialAvailable,
            shortageUnits,
            status: 'PENDING DONOR SUPPORT',
            message: `Blood bank inventory is insufficient. ${shortageUnits} unit(s) required from matching donors.`,
            location: request.location,
            hospitalId: request.hospitalId,
            bloodBankId: request.bloodBankId,
        } as any)

    if (updateRequestErrors?.length || !updatedRequest) {
        console.error(
            'BloodRequest shortage update errors:',
            updateRequestErrors,
        )

        throw new Error(
            updateRequestErrors?.map(error => error.message).join('; ') ??
            'Blood request shortage update failed.',
        )
    }

    console.log('DONOR SUPPORT REQUIRED')

    return {
        requestId: request.id,
        bloodGroup: request.bloodGroup,
        requiredUnits,
        availableUnits,
        allocatedUnits: 0,
        remainingInventory: availableUnits,
        shortageUnits,
        status: 'PENDING DONOR SUPPORT',
        message: `${shortageUnits} unit(s) required from matching donors.`,
    }
}