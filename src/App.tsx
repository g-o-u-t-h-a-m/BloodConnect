import { useEffect, useState } from 'react'

import { fetchAuthSession } from 'aws-amplify/auth'

import { generateClient } from 'aws-amplify/data'

import type { Schema } from '../amplify/data/resource'

import { Authenticator } from '@aws-amplify/ui-react'

import './index.css'

import './role-sidebar.css'



const client = generateClient<Schema>()



type InventoryItem = {

  available: number

  threshold: number

  id?: string

}



type Inventory = Record<string, InventoryItem>



type View =

  | 'home'

  | 'blood-bank-inventory'

  | 'hospital'

  | 'donor'

  | 'administrator'



type Role = 'ADMINS' | 'HOSPITALS' | 'BLOOD_BANKS' | 'DONORS'



type RequestStatus = 'FULFILLED' | 'PENDING DONOR SUPPORT'



type DonationStatus = 'AVAILABLE' | 'ACCEPTED' | 'DONATED'



type BloodRequest = {

  id?: string

  bloodGroup: string

  units: number

  location: string

  status: RequestStatus

  message: string

  initialAvailable: number

  shortageUnits: number

  bloodBankId?: string

  hospitalId?: string

}



type Donor = {
  id: string
  name: string
  email: string
  phone?: string | null
  bloodGroup: string
  location: string
  donationStatus: DonationStatus
  availability?: string | null
  accountStatus?: string | null
}

type DonationRecord = {
  id: string
  status: DonationStatus
  donorId: string
  bloodRequestId: string
  bloodBankId: string
  createdAt?: string | null
}



const initialInventory: Inventory = {

  'A+': { available: 8, threshold: 5 },

  'A-': { available: 3, threshold: 5 },

  'B+': { available: 6, threshold: 5 },

  'B-': { available: 2, threshold: 5 },

  'AB+': { available: 4, threshold: 5 },

  'AB-': { available: 1, threshold: 5 },

  'O+': { available: 12, threshold: 5 },

  'O-': { available: 3, threshold: 5 },

}



const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']



const getRoleView = (role: Role): View => {

  if (role === 'ADMINS') return 'administrator'

  if (role === 'HOSPITALS') return 'hospital'

  if (role === 'DONORS') return 'donor'

  return 'blood-bank-inventory'

}



function ProfileSetup({ role, email, onComplete }: { role: Role; email: string; onComplete: (profile: any) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '', hospitalType: '',
    registrationNumber: '', licenseNumber: '', licenseValidUntil: '', category: '', contactPerson: '',
    address: '', location: '', pincode: '', componentFacility: false, apheresisFacility: false,
    emergencyContactName: '', emergencyContactPhone: '',
  })
  const update = (key: keyof typeof form, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }))
  const submit = async () => {
    if (!form.name.trim() || !form.location.trim()) return alert('Please enter your name and location.')
    if (role === 'DONORS' && !form.bloodGroup) return alert('Please select your blood group.')
    if (role === 'HOSPITALS' && !form.registrationNumber.trim()) return alert('Please enter the hospital registration number.')
    if (role === 'BLOOD_BANKS' && !form.licenseNumber.trim()) return alert('Please enter the blood bank licence number.')
    setSaving(true)
    let createdProfile: any = null
    try {
      if (role === 'DONORS') {
        const existing = await client.models.Donor.list({ filter: { email: { eq: email } } } as any)
        const existingProfile = existing.data?.find(item => item.email?.trim().toLowerCase() === email.trim().toLowerCase())
        if (existingProfile) {
          alert('Your donor profile already exists. Opening your dashboard.')
          onComplete(existingProfile)
          return
        }
        const { data, errors } = await client.models.Donor.create({
          name: form.name.trim(), email, phone: form.phone.trim(), dateOfBirth: form.dateOfBirth, gender: form.gender,
          bloodGroup: form.bloodGroup, address: form.address.trim(), location: form.location.trim(), pincode: form.pincode.trim(),
          emergencyContactName: form.emergencyContactName.trim(), emergencyContactPhone: form.emergencyContactPhone.trim(),
          donationStatus: 'AVAILABLE', availability: 'AVAILABLE', accountStatus: 'ACTIVE',
        } as any)
        if (!data) throw new Error(errors?.map(e => e.message).join('; ') || 'Donor profile was not created.')
        createdProfile = data
      } else if (role === 'HOSPITALS') {
        const existing = await client.models.Hospital.list({ filter: { email: { eq: email } } } as any)
        const existingProfile = existing.data?.find(item => item.email?.trim().toLowerCase() === email.trim().toLowerCase())
        if (existingProfile) {
          alert('Your hospital profile already exists. Opening your dashboard.')
          onComplete(existingProfile)
          return
        }
        const { data, errors } = await client.models.Hospital.create({
          name: form.name.trim(), email, phone: form.phone.trim(), hospitalType: form.hospitalType.trim(),
          registrationNumber: form.registrationNumber.trim(), contactPerson: form.contactPerson.trim(), address: form.address.trim(),
          location: form.location.trim(), pincode: form.pincode.trim(), verificationStatus: 'PENDING',
        } as any)
        if (!data) throw new Error(errors?.map(e => e.message).join('; ') || 'Hospital profile was not created.')
        createdProfile = data
      } else {
        const existing = await client.models.BloodBank.list({ filter: { email: { eq: email } } } as any)
        const existingProfile = existing.data?.find(item => item.email?.trim().toLowerCase() === email.trim().toLowerCase())
        if (existingProfile) {
          alert('Your blood bank profile already exists. Opening your dashboard.')
          onComplete(existingProfile)
          return
        }
        const { data, errors } = await client.models.BloodBank.create({
          name: form.name.trim(), email, phone: form.phone.trim(), registrationNumber: form.registrationNumber.trim(),
          licenseNumber: form.licenseNumber.trim(), licenseValidUntil: form.licenseValidUntil, category: form.category.trim(),
          contactPerson: form.contactPerson.trim(), address: form.address.trim(), location: form.location.trim(), pincode: form.pincode.trim(),
          componentFacility: form.componentFacility, apheresisFacility: form.apheresisFacility, verificationStatus: 'PENDING',
        } as any)
        if (!data) throw new Error(errors?.map(e => e.message).join('; ') || 'Blood bank profile was not created.')
        createdProfile = data
      }
      if (!createdProfile) throw new Error('Profile was created but no profile record was returned.')
      alert('Profile created successfully. Your BloodConnect dashboard is now ready.')
      onComplete(createdProfile)
    } catch (error) {
      console.error('Profile creation failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to create profile.')
    } finally { setSaving(false) }
  }
  const input = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <>
      <label>{label}</label>
      <input type={type} value={String(form[key])} placeholder={placeholder} onChange={event => update(key, event.target.value)} />
    </>
  )
  return (
    <div className="app">
      <header className="hero-section"><h1 className="project-name">Complete Your Profile</h1><p className="tagline">Complete your one-time {role.toLowerCase()} profile to continue.</p></header>
      <section className="inventory-section"><div className="inventory-form">
        <h2>{role === 'DONORS' ? 'Donor Profile' : role === 'HOSPITALS' ? 'Hospital Profile' : 'Blood Bank Profile'}</h2>
        <p><strong>Authenticated email:</strong> {email}</p>
        {input('name', role === 'DONORS' ? 'Full Name' : role === 'HOSPITALS' ? 'Hospital Name' : 'Blood Bank Name')}
        {input('phone', 'Phone Number', 'tel')}
        {role === 'DONORS' && <>
          {input('dateOfBirth', 'Date of Birth', 'date')}
          <label>Gender</label><select value={form.gender} onChange={e => update('gender', e.target.value)}><option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
          <label>Blood Group</label><select value={form.bloodGroup} onChange={e => update('bloodGroup', e.target.value)}><option value="">Select Blood Group</option>{bloodGroups.map(group => <option key={group}>{group}</option>)}</select>
          {input('emergencyContactName', 'Emergency Contact Name')}{input('emergencyContactPhone', 'Emergency Contact Phone', 'tel')}
        </>}
        {role === 'HOSPITALS' && <>{input('hospitalType', 'Hospital Type', 'text', 'Government / Private / Trust')}{input('registrationNumber', 'Hospital Registration Number')}{input('contactPerson', 'Authorized Contact Person')}</>}
        {role === 'BLOOD_BANKS' && <>{input('registrationNumber', 'Registration Number')}{input('licenseNumber', 'Blood Bank Licence Number')}{input('licenseValidUntil', 'Licence Valid Until', 'date')}{input('category', 'Category', 'text', 'Government / Private / Hospital')}{input('contactPerson', 'Authorized Contact Person')}
          <label><input type="checkbox" checked={form.componentFacility} onChange={e => update('componentFacility', e.target.checked)} /> Component Facility</label>
          <label><input type="checkbox" checked={form.apheresisFacility} onChange={e => update('apheresisFacility', e.target.checked)} /> Apheresis Facility</label>
        </>}
        {input('address', 'Full Address', 'text', 'Street, area, city')}{input('location', 'Location / City')}{input('pincode', 'Pincode')}
        <button className="btn" onClick={submit} disabled={saving}>{saving ? 'Saving Profile...' : 'Create Profile'}</button>
      </div></section>
    </div>
  )
}

function BloodConnectApp({ role, loginId }: { role: Role; loginId: string }) {

  const [view, setView] = useState<View>(() => getRoleView(role))

  const [inventory, setInventory] = useState<Inventory>(initialInventory)

  const [bloodBankId, setBloodBankId] = useState<string | null>(null)

  const [hospitalId, setHospitalId] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(role === 'ADMINS')
  const [profileLoading, setProfileLoading] = useState(role !== 'ADMINS')



  const [formBloodGroup, setFormBloodGroup] = useState('')

  const [formAvailableUnits, setFormAvailableUnits] = useState<number | ''>('')

  const [formShortageThreshold, setFormShortageThreshold] =

    useState<number | ''>(5)



  const [requestedBloodGroup, setRequestedBloodGroup] = useState('')

  const [requestedUnits, setRequestedUnits] = useState<number | ''>('')

  const [requestedLocation, setRequestedLocation] = useState('')



  const [lastRequest, setLastRequest] = useState<BloodRequest | null>(null)

  const [pendingRequest, setPendingRequest] =

    useState<BloodRequest | null>(null)



  const [donors, setDonors] = useState<Donor[]>([])
  const [donationRecords, setDonationRecords] = useState<any[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [bloodBanks, setBloodBanks] = useState<any[]>([])
  const [hospitalRequests, setHospitalRequests] = useState<any[]>([])
  const [adminInventory, setAdminInventory] = useState<Inventory>({})
  const [verificationBusy, setVerificationBusy] = useState<string | null>(null)
  const [adminSection, setAdminSection] = useState<'dashboard' | 'users' | 'hospitals'>('dashboard')







  useEffect(() => {

    setView(getRoleView(role))

  }, [role])



  useEffect(() => {
    let cancelled = false
    const loadAWSData = async () => {
      const email = loginId.trim().toLowerCase()
      if (!email) {
        // Cognito can briefly render before signInDetails.loginId is available.
        // Keep the app loading instead of flashing the onboarding form.
        if (!cancelled) {
          setProfileReady(false)
          setProfileLoading(true)
        }
        return
      }

      try {
        let currentBloodBank: any = null
        let currentHospital: any = null
        let currentDonor: any = null

        if (role === 'BLOOD_BANKS') {
          const result = await client.models.BloodBank.list({
            filter: { email: { eq: loginId } },
          } as any)
          if (result.errors?.length) console.error('Blood Bank profile lookup errors:', result.errors)
          currentBloodBank = result.data?.find(item => item.email?.trim().toLowerCase() === email) ?? null
          if (!currentBloodBank) {
            if (!cancelled) {
              setProfileReady(false)
              setProfileLoading(false)
            }
            return
          }
          setBloodBankId(currentBloodBank.id)
        }

        if (role === 'HOSPITALS') {
          const result = await client.models.Hospital.list({
            filter: { email: { eq: loginId } },
          } as any)
          if (result.errors?.length) console.error('Hospital profile lookup errors:', result.errors)
          currentHospital = result.data?.find(item => item.email?.trim().toLowerCase() === email) ?? null
          if (!currentHospital) {
            if (!cancelled) {
              setProfileReady(false)
              setProfileLoading(false)
            }
            return
          }
          setHospitalId(currentHospital.id)
        }

        if (role === 'DONORS') {
          const result = await client.models.Donor.list({
            filter: { email: { eq: loginId } },
          } as any)
          if (result.errors?.length) console.error('Donor profile lookup errors:', result.errors)
          currentDonor = result.data?.find(item => item.email?.trim().toLowerCase() === email) ?? null
          if (!currentDonor) {
            if (!cancelled) {
              setProfileReady(false)
              setProfileLoading(false)
            }
            return
          }

          setDonors(previous => [
            ...previous.filter(item => item.id !== currentDonor.id),
            {
              id: currentDonor.id,
              name: currentDonor.name,
              email: currentDonor.email,
              phone: currentDonor.phone,
              bloodGroup: currentDonor.bloodGroup,
              location: currentDonor.location,
              donationStatus: currentDonor.donationStatus as DonationStatus,
              availability: currentDonor.availability,
              accountStatus: currentDonor.accountStatus,
            },
          ])
        }

        // The profile itself is valid at this point. Auxiliary data must not
        // send an already-registered user back to onboarding if another
        // dashboard query has a temporary authorization/loading problem.
        if (!cancelled) {
          setProfileReady(true)
          setProfileLoading(false)
        }

        let relevantRequests: any[] = []

        try {
          const bloodBankResult = await client.models.BloodBank.list()
          if (bloodBankResult.errors?.length) {
            console.error('Blood Bank list errors:', bloodBankResult.errors)
          }
          const allBloodBanks = bloodBankResult.data ?? []
          if (role === 'ADMINS') setBloodBanks(allBloodBanks.filter(Boolean).map(item => ({ ...item, verificationStatus: item.verificationStatus ?? 'PENDING' })))
          const bloodBanksForDashboard = allBloodBanks
          if (!currentBloodBank && role === 'HOSPITALS') {
            currentBloodBank =
              bloodBanksForDashboard.find(item => item.verificationStatus === 'APPROVED') ??
              bloodBanksForDashboard[0] ??
              null
          }
          if (currentBloodBank) setBloodBankId(currentBloodBank.id)

          // Restore persisted requests after every login.
          if (currentBloodBank || currentHospital || role === 'DONORS') {
            const requestResult = await client.models.BloodRequest.list()
            if (requestResult.errors?.length) {
              console.error('Blood request list errors:', requestResult.errors)
            }
            const allRequests = (requestResult.data ?? []).filter(Boolean)
            relevantRequests = allRequests
              .filter(item =>
                role === 'HOSPITALS'
                  ? item.hospitalId === currentHospital?.id
                  : role === 'DONORS'
                    ? item.status === 'PENDING DONOR SUPPORT'
                    : item.bloodBankId === currentBloodBank?.id,
              )
              .sort((a, b) =>
                String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? '')),
              )

            setHospitalRequests(relevantRequests)

            const latestRequest = relevantRequests.find(
              item => item?.status === 'PENDING DONOR SUPPORT',
            )

            // Hospitals must use the Blood Bank actually attached to their
            // current request. Do not keep using an arbitrary approved bank
            // when multiple Blood Bank records exist. This keeps the
            // hospital's inventory view consistent with the request's
            // bloodBankId and with the Blood Bank dashboard.
            if (role === 'HOSPITALS' && latestRequest?.bloodBankId) {
              const requestBloodBank = allBloodBanks.find(
                item => item?.id === latestRequest.bloodBankId,
              )
              if (requestBloodBank) {
                currentBloodBank = requestBloodBank
                setBloodBankId(requestBloodBank.id)
              }
            }

            // A donor is not tied to one Blood Bank. Load the inventory for the
            // Blood Bank attached to the request the donor is currently viewing.
            if (role === 'DONORS' && latestRequest?.bloodBankId) {
              const donorInventoryResult = await client.models.Inventory.list()
              if (donorInventoryResult.errors?.length) {
                console.error('Donor inventory lookup errors:', donorInventoryResult.errors)
              }
              const bankInventory = (donorInventoryResult.data ?? []).filter(
                item => item.bloodBankId === latestRequest.bloodBankId,
              )
              const donorInventory: Inventory = { ...initialInventory }
              for (const group of bloodGroups) {
                const existingItem = bankInventory.find(item => item.bloodGroup === group)
                if (existingItem) {
                  donorInventory[group] = {
                    available: existingItem.availableUnits,
                    threshold: existingItem.threshold,
                    id: existingItem.id,
                  }
                }
              }
              setInventory(donorInventory)
            }

            if (latestRequest) {
              setPendingRequest({
                id: latestRequest.id,
                bloodGroup: latestRequest.bloodGroup,
                units: latestRequest.unitsRequired,
                location: latestRequest.location,
                status: latestRequest.status as RequestStatus,
                message: latestRequest.message,
                initialAvailable: latestRequest.initialAvailable,
                shortageUnits: latestRequest.shortageUnits,
                bloodBankId: latestRequest.bloodBankId,
                hospitalId: latestRequest.hospitalId,
              })
              setLastRequest({
                id: latestRequest.id,
                bloodGroup: latestRequest.bloodGroup,
                units: latestRequest.unitsRequired,
                location: latestRequest.location,
                status: latestRequest.status as RequestStatus,
                message: latestRequest.message,
                initialAvailable: latestRequest.initialAvailable,
                shortageUnits: latestRequest.shortageUnits,
                bloodBankId: latestRequest.bloodBankId,
                hospitalId: latestRequest.hospitalId,
              })
            } else if (relevantRequests.length > 0) {
              const latest = relevantRequests[0]
              setLastRequest({
                id: latest.id,
                bloodGroup: latest.bloodGroup,
                units: latest.unitsRequired,
                location: latest.location,
                status: latest.status as RequestStatus,
                message: latest.message,
                initialAvailable: latest.initialAvailable,
                shortageUnits: latest.shortageUnits,
                bloodBankId: latest.bloodBankId,
                hospitalId: latest.hospitalId,
              })
              if (role === 'BLOOD_BANKS') setPendingRequest(null)
            } else {
              setLastRequest(null)
              if (role === 'BLOOD_BANKS') setPendingRequest(null)
            }
          }

          if (currentBloodBank) {
            const inventoryResult = await client.models.Inventory.list()
            if (inventoryResult.errors?.length) {
              console.error('Inventory list errors:', inventoryResult.errors)
            }
            const existingInventory = inventoryResult.data ?? []
            const bankInventory = existingInventory.filter(item => item.bloodBankId === currentBloodBank.id)
            const updatedInventory: Inventory = { ...initialInventory }

            for (const group of bloodGroups) {
              const existingItem = bankInventory.find(item => item.bloodGroup === group)
              if (existingItem) {
                updatedInventory[group] = {
                  available: existingItem.availableUnits,
                  threshold: existingItem.threshold,
                  id: existingItem.id,
                }
              } else if (role === 'BLOOD_BANKS') {
                const initialData = initialInventory[group]
                const { data: newItem, errors } = await client.models.Inventory.create({
                  bloodGroup: group,
                  availableUnits: initialData.available,
                  threshold: initialData.threshold,
                  bloodBankId: currentBloodBank.id,
                } as any)
                if (errors?.length) console.error(`Inventory create errors for ${group}:`, errors)
                if (newItem) {
                  updatedInventory[group] = {
                    available: newItem.availableUnits,
                    threshold: newItem.threshold,
                    id: newItem.id,
                  }
                }
              }
            }
            setInventory(updatedInventory)
          }
        } catch (auxiliaryError) {
          console.error('Failed to load auxiliary dashboard data:', auxiliaryError)
        }

        if (role === 'ADMINS') {
          try {
            const hospitalResult = await client.models.Hospital.list()
            if (hospitalResult.errors?.length) console.error('Hospital list errors:', hospitalResult.errors)
            setHospitals((hospitalResult.data ?? []).filter(Boolean).map(item => ({ ...item, verificationStatus: item.verificationStatus ?? 'PENDING' })))
          } catch (hospitalError) {
            console.error('Failed to load hospital verification data:', hospitalError)
          }

          try {
            const inventoryResult = await client.models.Inventory.list()
            if (inventoryResult.errors?.length) {
              console.error('Admin inventory list errors:', inventoryResult.errors)
            }

            const aggregated: Inventory = {}

            for (const group of bloodGroups) {
              const records = (inventoryResult.data ?? []).filter(
                item => item?.bloodGroup === group,
              )

              if (records.length > 0) {
                aggregated[group] = {
                  available: records.reduce(
                    (total, item) => total + (item.availableUnits ?? 0),
                    0,
                  ),
                  threshold: records.reduce(
                    (total, item) => total + (item.threshold ?? 0),
                    0,
                  ),
                }
              } else {
                aggregated[group] = initialInventory[group]
              }
            }

            setAdminInventory(aggregated)
          } catch (inventoryError) {
            console.error('Failed to load admin inventory data:', inventoryError)
            setAdminInventory(initialInventory)
          }

          try {
            const requestResult = await client.models.BloodRequest.list()
            if (requestResult.errors?.length) {
              console.error('Admin blood request list errors:', requestResult.errors)
            }
            setHospitalRequests((requestResult.data ?? []).filter(Boolean))
          } catch (requestError) {
            console.error('Failed to load admin request data:', requestError)
          }
        }

        try {
          const donorResult = await client.models.Donor.list()
          if (donorResult.errors?.length) {
            console.error('Donor list errors:', donorResult.errors)
          }

          const existingDonors = (donorResult.data ?? []).filter(Boolean)

          setDonors(existingDonors.map(donor => ({
            id: donor.id,
            name: donor.name,
            email: donor.email,
            phone: donor.phone,
            bloodGroup: donor.bloodGroup,
            location: donor.location,
            donationStatus: donor.donationStatus as DonationStatus,
            availability: donor.availability ?? 'AVAILABLE',
            accountStatus: donor.accountStatus ?? 'ACTIVE',
          })))
        } catch (donorError) {
          console.error('Failed to load donor data:', donorError)
          // Keep the already-loaded authenticated profile in state.
        }

        let loadedDonations: DonationRecord[] = []

        try {
          const donationResult = await client.models.Donation.list()
          if (donationResult.errors?.length) {
            console.error('Donation list errors:', donationResult.errors)
          }

          loadedDonations = (donationResult.data ?? [])
            .filter(Boolean)
            .map(item => ({
              id: item.id,
              status: item.status as DonationStatus,
              donorId: item.donorId,
              bloodRequestId: item.bloodRequestId,
              bloodBankId: item.bloodBankId,
              createdAt: item.createdAt,
            }))

          setDonationRecords(loadedDonations)

        } catch (donationError) {
          console.error('Failed to load donation data:', donationError)
          setDonationRecords([])
        }


        // For Blood Banks, select only requests belonging to the logged-in Blood Bank.
        // Prefer a request that already has an accepted donation. Never select another
        // Blood Bank's request just because it is newer.
        if (role === 'BLOOD_BANKS' && currentBloodBank) {
          try {
            const pendingRequests = relevantRequests.filter(
              item => item?.status === 'PENDING DONOR SUPPORT',
            )

            const acceptedRequest = pendingRequests
              .map(request => {
                const acceptedDonation = loadedDonations
                  .filter(
                    donation =>
                      donation.bloodRequestId === request.id &&
                      donation.bloodBankId === currentBloodBank.id &&
                      donation.status === 'ACCEPTED',
                  )
                  .sort((a, b) =>
                    String(b.createdAt ?? '').localeCompare(
                      String(a.createdAt ?? ''),
                    ),
                  )[0]
                return { request, acceptedDonation }
              })
              .filter(item => item.acceptedDonation)
              .sort((a, b) =>
                String(b.acceptedDonation?.createdAt ?? '').localeCompare(
                  String(a.acceptedDonation?.createdAt ?? ''),
                ),
              )[0]?.request

            const selectedRequest = acceptedRequest ?? pendingRequests[0] ?? null

            if (selectedRequest) {
              const selected: BloodRequest = {
                id: selectedRequest.id,
                bloodGroup: selectedRequest.bloodGroup,
                units: selectedRequest.unitsRequired,
                location: selectedRequest.location,
                status: selectedRequest.status as RequestStatus,
                message: selectedRequest.message,
                initialAvailable: selectedRequest.initialAvailable,
                shortageUnits: selectedRequest.shortageUnits,
                bloodBankId: selectedRequest.bloodBankId,
                hospitalId: selectedRequest.hospitalId,
              }
              setPendingRequest(selected)
              setLastRequest(selected)
            } else {
              setPendingRequest(null)
            }
          } catch (requestSelectionError) {
            console.error('Failed to select Blood Bank pending request:', requestSelectionError)
          }
        }

      } catch (error) {
        console.error('Failed to load authenticated profile:', error)
        if (!cancelled) {
          setProfileReady(false)
          setProfileLoading(false)
        }
      }
    }

    loadAWSData()
    return () => {
      cancelled = true
    }
  }, [role, loginId])

  const handleHospitalVerification = async (id: string, status: string) => {
    setVerificationBusy(id)
    try {
      const { data, errors } = await client.models.Hospital.update({ id, verificationStatus: status } as any)
      if (errors?.length) throw new Error(errors.map(error => error.message).join('; '))
      if (!data) throw new Error('Hospital verification update failed.')
      setHospitals(previous => previous.map(item => item.id === id ? { ...item, verificationStatus: status } : item))
      alert(`Hospital ${status.toLowerCase()} successfully.`)
    } catch (error) {
      console.error('Hospital verification failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to update hospital verification.')
    } finally { setVerificationBusy(null) }
  }

  const handleBloodBankVerification = async (id: string, status: string) => {
    setVerificationBusy(id)
    try {
      const { data, errors } = await client.models.BloodBank.update({ id, verificationStatus: status } as any)
      if (errors?.length) throw new Error(errors.map(error => error.message).join('; '))
      if (!data) throw new Error('Blood bank verification update failed.')
      setBloodBanks(previous => previous.map(item => item.id === id ? { ...item, verificationStatus: status } : item))
      alert(`Blood bank ${status.toLowerCase()} successfully.`)
    } catch (error) {
      console.error('Blood bank verification failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to update blood bank verification.')
    } finally { setVerificationBusy(null) }
  }

  const getStatus = (

    available: number,

    threshold: number,

  ): 'NORMAL' | 'LOW STOCK' =>

    available < threshold ? 'LOW STOCK' : 'NORMAL'



  const normalizeLocation = (location: string) =>

    location.trim().toLowerCase()



  const getMatchingDonors = () => {

    if (!pendingRequest) return []



    const requestLocation = normalizeLocation(

      pendingRequest.location,

    )



    return donors.filter(

      donor =>

        donor.bloodGroup === pendingRequest.bloodGroup &&

        normalizeLocation(donor.location) === requestLocation &&

        donor.donationStatus !== 'DONATED',

    )

  }



  const getAcceptedDonors = () => {
    if (!pendingRequest) return []

    const requestLocation = normalizeLocation(
      pendingRequest.location,
    )

    const acceptedDonations = donationRecords.filter(
      donation =>
        donation.status === 'ACCEPTED' &&
        donation.bloodRequestId === pendingRequest.id &&
        donation.bloodBankId === bloodBankId,
    )

    return acceptedDonations
      .map(donation =>
        donors.find(
          donor => donor.id === donation.donorId,
        ),
      )
      .filter(
        (donor): donor is Donor =>
          Boolean(donor) &&
          donor.bloodGroup === pendingRequest.bloodGroup &&
          normalizeLocation(donor.location) === requestLocation,
      )
  }


  // Use accepted Donation records as the source of truth for the Blood Bank.
  // This handles multiple identical pending requests safely because each
  // Donation carries the exact bloodRequestId it belongs to.
  const getAcceptedEntries = () => {
    if (!bloodBankId) return []

    return donationRecords
      .filter(
        donation =>
          donation.status === 'ACCEPTED' &&
          donation.bloodBankId === bloodBankId,
      )
      .map(donation => {
        const rawRequest = hospitalRequests.find(
          request =>
            request.id === donation.bloodRequestId &&
            request.bloodBankId === bloodBankId &&
            request.status === 'PENDING DONOR SUPPORT',
        )
        const donor = donors.find(item => item.id === donation.donorId)

        if (!rawRequest || !donor) {
          console.warn('Accepted donation could not be linked:', {
            donation,
            hasRequest: Boolean(rawRequest),
            hasDonor: Boolean(donor),
          })
          return null
        }

        const request: BloodRequest = {
          id: rawRequest.id,
          bloodGroup: rawRequest.bloodGroup,
          units: rawRequest.unitsRequired,
          location: rawRequest.location,
          status: rawRequest.status as RequestStatus,
          message: rawRequest.message,
          initialAvailable: rawRequest.initialAvailable,
          shortageUnits: rawRequest.shortageUnits,
          bloodBankId: rawRequest.bloodBankId,
          hospitalId: rawRequest.hospitalId,
        }

        return { donation: donation as DonationRecord, donor, request }
      })
      .filter(
        (entry): entry is { donation: DonationRecord; donor: Donor; request: BloodRequest } =>
          entry !== null,
      )
  }


  const getConfirmedDonors = () => {
    if (!pendingRequest?.id) return []

    const confirmedDonorIds = new Set(
      donationRecords
        .filter(
          donation =>
            donation.bloodRequestId === pendingRequest.id &&
            donation.status === 'DONATED',
        )
        .map(donation => donation.donorId),
    )

    return donors.filter(donor => confirmedDonorIds.has(donor.id))
  }


  const handleSubmit = async () => {

    if (!formBloodGroup) {

      alert('Please select a blood group')

      return

    }



    if (

      formAvailableUnits === '' ||

      formShortageThreshold === ''

    ) {

      alert('Please fill in all inventory details')

      return

    }



    if (!bloodBankId) {

      alert('Blood Bank is still loading. Please try again.')

      return

    }



    try {

      const currentItem = inventory[formBloodGroup]



      if (currentItem.id) {

        const { data: updatedItem } =

          await client.models.Inventory.update({

            id: currentItem.id,

            bloodGroup: formBloodGroup,

            availableUnits: formAvailableUnits,

            threshold: formShortageThreshold,

            bloodBankId,

          } as any)



        if (updatedItem) {

          setInventory(previous => ({

            ...previous,

            [formBloodGroup]: {

              available: updatedItem.availableUnits,

              threshold: updatedItem.threshold,

              id: updatedItem.id,

            },

          }))

        }

      } else {

        const { data: newItem } =

          await client.models.Inventory.create({

            bloodGroup: formBloodGroup,

            availableUnits: formAvailableUnits,

            threshold: formShortageThreshold,

            bloodBankId,

          } as any)



        if (newItem) {

          setInventory(previous => ({

            ...previous,

            [formBloodGroup]: {

              available: newItem.availableUnits,

              threshold: newItem.threshold,

              id: newItem.id,

            },

          }))

        }

      }



      alert(`${formBloodGroup} inventory saved successfully.`)

      setFormBloodGroup('')

      setFormAvailableUnits('')

      setFormShortageThreshold(5)

    } catch (error) {

      console.error('Failed to save inventory:', error)

      alert('Failed to save inventory to AWS.')

    }

  }



  const handleBloodRequest = async () => {

    if (!requestedBloodGroup) {
      alert('Please select a blood group')
      return
    }

    if (!requestedLocation.trim()) {
      alert('Please enter the hospital location')
      return
    }

    if (requestedUnits === '' || requestedUnits <= 0) {
      alert('Please enter a valid number of units')
      return
    }

    if (!hospitalId || !bloodBankId) {
      alert(
        'Hospital and Blood Bank are still loading. Please try again.',
      )
      return
    }

    const bloodData = inventory[requestedBloodGroup]

    if (!bloodData) {
      alert(
        'Inventory information is unavailable for this blood group.',
      )
      return
    }

    const requestLocation = requestedLocation.trim()

    try {
      // ---------------------------------------------------
      // 1. CREATE REQUEST
      // ---------------------------------------------------

      const { data: createdRequest, errors } =
        await client.models.BloodRequest.create({
          bloodGroup: requestedBloodGroup,
          unitsRequired: requestedUnits,
          initialAvailable: bloodData.available,
          shortageUnits: 0,
          status: 'PROCESSING',
          message:
            `Blood request submitted for automated processing.`,
          location: requestLocation,
          hospitalId,
          bloodBankId,
        } as any)

      if (errors?.length) {
        console.error(
          'BloodRequest create errors:',
          errors,
        )
      }

      if (!createdRequest) {
        const errorMessage = errors?.length
          ? errors.map(error => error.message).join('; ')
          : 'Blood request was not created.'

        throw new Error(errorMessage)
      }

      console.log(
        'Blood request created:',
        createdRequest.id,
      )

      // ---------------------------------------------------
      // 2. START STEP FUNCTIONS
      // ---------------------------------------------------

      const {
        data: workflowData,
        errors: workflowErrors,
      } =
        await client.mutations.startBloodRequestProcessing({
          bloodRequestId: createdRequest.id,
        })

      if (workflowErrors?.length) {
        console.error(
          'Workflow start errors:',
          workflowErrors,
        )

        throw new Error(
          workflowErrors
            .map(error => error.message)
            .join('; '),
        )
      }

      console.log(
        'Blood processing workflow started:',
        workflowData,
      )

      // ---------------------------------------------------
      // 3. WAIT FOR WORKFLOW TO FINISH
      // ---------------------------------------------------

      let processedRequest: any = null
      let processedInventory: any = null

      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(resolve =>
          setTimeout(resolve, 500),
        )

        const requestResult =
          await client.models.BloodRequest.get({
            id: createdRequest.id,
          })

        processedRequest = requestResult.data

        if (
          processedRequest &&
          processedRequest.status !== 'PROCESSING'
        ) {
          break
        }
      }

      // ---------------------------------------------------
      // 4. REFRESH INVENTORY
      // ---------------------------------------------------

      if (bloodData.id) {
        const inventoryResult =
          await client.models.Inventory.get({
            id: bloodData.id,
          })

        processedInventory =
          inventoryResult.data
      }

      // ---------------------------------------------------
      // 5. UPDATE UI
      // ---------------------------------------------------

      if (processedInventory) {
        setInventory(previous => ({
          ...previous,
          [requestedBloodGroup]: {
            available:
              processedInventory.availableUnits,
            threshold:
              processedInventory.threshold,
            id: processedInventory.id,
          },
        }))
      }

      if (processedRequest) {
        const finalRequest: BloodRequest = {
          id: processedRequest.id,
          bloodGroup:
            processedRequest.bloodGroup,
          units:
            processedRequest.unitsRequired,
          location:
            processedRequest.location,
          status:
            processedRequest.status as RequestStatus,
          initialAvailable:
            processedRequest.initialAvailable,
          shortageUnits:
            processedRequest.shortageUnits,
          message:
            processedRequest.message,
          bloodBankId:
            processedRequest.bloodBankId,
          hospitalId:
            processedRequest.hospitalId,
        }

        setLastRequest(finalRequest)

        if (
          processedRequest.status ===
          'PENDING DONOR SUPPORT'
        ) {
          setPendingRequest(finalRequest)
        } else {
          setPendingRequest(null)
        }

        setRequestedUnits('')

        if (
          processedRequest.status ===
          'FULFILLED'
        ) {
          alert(
            `Blood request fulfilled automatically. ${requestedUnits} unit(s) allocated.`,
          )
        } else {
          alert(
            `Blood request processed. ${processedRequest.shortageUnits} unit(s) of donor support are required.`,
          )
        }

        return
      }

      throw new Error(
        'The workflow was started but the final request status could not be loaded.',
      )
    } catch (error) {
      console.error(
        'Failed to process blood request:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to process the blood request.',
      )
    }
  }



  const handleAcceptDonation = async (donor: Donor) => {

    if (!pendingRequest || !pendingRequest.id) {

      alert(

        'The blood request ID is missing. Please create the request again.',

      )

      return

    }



    if (!pendingRequest.bloodBankId) {
      alert('This request is not linked to a blood bank. Please create a fresh request.')
      return
    }



    if (donor.bloodGroup !== pendingRequest.bloodGroup) return



    if (

      normalizeLocation(donor.location) !==

      normalizeLocation(pendingRequest.location)

    )

      return



    // Donation status is global donor state; the Donation record is the
    // source of truth for whether this specific request was accepted.
    if (donor.donationStatus === 'DONATED') return



    try {

      const { data: existingDonations } =

        await client.models.Donation.list()



      const existingDonation = existingDonations.find(

        donation =>

          donation.donorId === donor.id &&

          donation.bloodRequestId === pendingRequest.id,

      )



      if (existingDonation) {

        alert(

          'This donor has already accepted this donation request.',

        )

        return

      }



      const { data: createdDonation, errors } =

        await client.models.Donation.create({

          status: 'ACCEPTED',

          donorId: donor.id,

          bloodRequestId: pendingRequest.id,

          bloodBankId: pendingRequest.bloodBankId,

        } as any)



      console.log(

        'Donation create result:',

        createdDonation,

      )

      console.log(

        'Donation create errors:',

        errors,

      )



      if (!createdDonation) {
        const errorMessage = errors?.length
          ? errors.map(error => error.message).join('; ')
          : 'Donation was not created.'

        throw new Error(errorMessage)
      }


      setDonationRecords(previous => [
        ...previous.filter(item => item.id !== createdDonation.id),
        {
          id: createdDonation.id,
          status: 'ACCEPTED',
          donorId: createdDonation.donorId,
          bloodRequestId: createdDonation.bloodRequestId,
          bloodBankId: createdDonation.bloodBankId,
          createdAt: createdDonation.createdAt,
        },
      ])

      const { data: updatedDonor } =

        await client.models.Donor.update({

          id: donor.id,

          name: donor.name,

          email: donor.email,

          bloodGroup: donor.bloodGroup,

          location: donor.location,

          donationStatus: 'ACCEPTED',

        } as any)



      if (!updatedDonor) {

        throw new Error(

          'Donor status could not be updated in AWS.',

        )

      }



      setDonors(previous =>

        previous.map(currentDonor =>

          currentDonor.id === donor.id

            ? {

              ...currentDonor,

              donationStatus: 'ACCEPTED',

            }

            : currentDonor,

        ),

      )



      alert(

        'Donation request accepted and saved to AWS.',

      )

    } catch (error) {

      console.error(

        'Failed to create donation:',

        error,

      )

      alert(

        'Failed to save the donation acceptance to AWS.',

      )

    }

  }



  const handleConfirmBloodReceived = async (
    donor: Donor,
    targetRequest: BloodRequest,
  ) => {
    const pendingRequest = targetRequest
    if (!pendingRequest?.id || !bloodBankId) return

    try {
      let acceptedDonation = donationRecords
        .filter(
          donation =>
            donation.donorId === donor.id &&
            donation.status === 'ACCEPTED' &&
            donation.bloodRequestId === pendingRequest.id,
        )
        .sort((a, b) =>
          String(b.createdAt ?? '').localeCompare(
            String(a.createdAt ?? ''),
          ),
        )[0]

      console.log('Confirm donor:', donor)
      console.log('Current pending request:', pendingRequest)
      console.log('Local accepted donation:', acceptedDonation)

      if (!acceptedDonation) {
        const { data: donations, errors: donationErrors } =
          await client.models.Donation.list()

        if (donationErrors?.length) {
          console.error('Donation lookup errors:', donationErrors)
        }

        const awsAcceptedDonation = (donations ?? [])
          .filter(
            item =>
              item.donorId === donor.id &&
              item.status === 'ACCEPTED' &&
              item.bloodRequestId === pendingRequest.id,
          )
          .sort((a, b) =>
            String(b.createdAt ?? '').localeCompare(
              String(a.createdAt ?? ''),
            ),
          )[0]

        if (awsAcceptedDonation) {
          acceptedDonation = {
            id: awsAcceptedDonation.id,
            status: 'ACCEPTED',
            donorId: awsAcceptedDonation.donorId,
            bloodRequestId: awsAcceptedDonation.bloodRequestId,
            bloodBankId: awsAcceptedDonation.bloodBankId,
            createdAt: awsAcceptedDonation.createdAt,
          }

          setDonationRecords(previous => [
            ...previous.filter(item => item.id !== acceptedDonation!.id),
            acceptedDonation!,
          ])
        }
      }

      if (!acceptedDonation) {
        console.error('No matching accepted donation found.', {
          donorId: donor.id,
          pendingRequestId: pendingRequest.id,
          bloodBankId,
          donationRecords,
        })
        alert(
          `No accepted donation is linked to this donor and hospital request. Donor ID: ${donor.id}. Request ID: ${pendingRequest.id}.`,
        )
        return
      }

      console.log('Accepted donation used for confirmation:', acceptedDonation)

      if (acceptedDonation.bloodRequestId !== pendingRequest.id) {
        const { data: actualRequest, errors: requestErrors } =
          await client.models.BloodRequest.get({
            id: acceptedDonation.bloodRequestId,
          })

        if (requestErrors?.length) {
          console.error('Actual donation request lookup errors:', requestErrors)
        }

        if (!actualRequest) {
          throw new Error('The accepted donation points to a request that could not be loaded.')
        }

        setPendingRequest({
          id: actualRequest.id,
          bloodGroup: actualRequest.bloodGroup,
          units: actualRequest.unitsRequired,
          location: actualRequest.location,
          status: actualRequest.status as RequestStatus,
          message: actualRequest.message,
          initialAvailable: actualRequest.initialAvailable,
          shortageUnits: actualRequest.shortageUnits,
          bloodBankId: actualRequest.bloodBankId,
          hospitalId: actualRequest.hospitalId,
        })

        return
      }

      const bloodGroup = pendingRequest.bloodGroup
      const requiredUnits = pendingRequest.units
      const currentAvailable = inventory[bloodGroup].available
      const updatedAvailable = currentAvailable + 1

      const { data: updatedDonation, errors: donationUpdateErrors } =
        await client.models.Donation.update({
          id: acceptedDonation.id,
          status: 'DONATED',
          donorId: acceptedDonation.donorId,
          bloodRequestId: acceptedDonation.bloodRequestId,
          bloodBankId: acceptedDonation.bloodBankId,
        } as any)

      if (donationUpdateErrors?.length) {
        throw new Error(
          donationUpdateErrors.map(error => error.message).join('; '),
        )
      }

      if (!updatedDonation) {
        throw new Error(
          'Donation status could not be updated in AWS.',
        )
      }

      const { data: updatedDonor, errors: donorUpdateErrors } =
        await client.models.Donor.update({
          id: donor.id,
          name: donor.name,
          email: donor.email,
          bloodGroup: donor.bloodGroup,
          location: donor.location,
          donationStatus: 'DONATED',
        } as any)

      if (donorUpdateErrors?.length) {
        throw new Error(
          donorUpdateErrors.map(error => error.message).join('; '),
        )
      }

      if (!updatedDonor) {
        throw new Error(
          'Donor status could not be updated in AWS.',
        )
      }

      if (!inventory[bloodGroup].id) {
        throw new Error(
          'Inventory record ID is missing.',
        )
      }

      const fulfilled = updatedAvailable >= requiredUnits
      const finalAvailable = fulfilled
        ? updatedAvailable - requiredUnits
        : updatedAvailable
      const stillNeeded = Math.max(requiredUnits - updatedAvailable, 0)
      const requestMessage = fulfilled
        ? `Required donor support has been received. ${requiredUnits} unit(s) of ${bloodGroup} have now been allocated to the hospital in ${pendingRequest.location}.`
        : `Donor support is in progress. The blood bank now has ${updatedAvailable} unit(s) of ${bloodGroup}. ${stillNeeded} more unit(s) are required before the hospital request in ${pendingRequest.location} can be fulfilled.`

      // Persist the real final inventory value. Previously AWS was left at
      // updatedAvailable even when the request was fulfilled.
      const { data: updatedInventory, errors: inventoryErrors } =
        await client.models.Inventory.update({
          id: inventory[bloodGroup].id,
          bloodGroup,
          availableUnits: finalAvailable,
          threshold: inventory[bloodGroup].threshold,
          bloodBankId,
        } as any)

      if (inventoryErrors?.length) {
        throw new Error(
          inventoryErrors.map(error => error.message).join('; '),
        )
      }
      if (!updatedInventory) {
        throw new Error('Inventory could not be updated in AWS.')
      }

      // Persist the BloodRequest state as well. Previously this was only
      // changed in React state, so refresh restored the old PENDING record.
      const { data: updatedRequest, errors: requestUpdateErrors } =
        await client.models.BloodRequest.update({
          id: pendingRequest.id,
          bloodGroup,
          unitsRequired: requiredUnits,
          initialAvailable: pendingRequest.initialAvailable,
          shortageUnits: fulfilled ? 0 : stillNeeded,
          status: fulfilled ? 'FULFILLED' : 'PENDING DONOR SUPPORT',
          message: requestMessage,
          location: pendingRequest.location,
          hospitalId: pendingRequest.hospitalId,
          bloodBankId: pendingRequest.bloodBankId ?? bloodBankId,
        } as any)

      if (requestUpdateErrors?.length) {
        throw new Error(
          requestUpdateErrors.map(error => error.message).join('; '),
        )
      }
      if (!updatedRequest) {
        throw new Error('Blood request could not be updated in AWS.')
      }

      setDonationRecords(previous =>
        previous.map(item =>
          item.id === acceptedDonation.id
            ? { ...item, status: 'DONATED', bloodBankId }
            : item,
        ),
      )

      setDonors(previous =>
        previous.map(currentDonor =>
          currentDonor.id === donor.id
            ? {
              ...currentDonor,
              donationStatus: 'DONATED',
            }
            : currentDonor,
        ),
      )

      setInventory(previous => ({
        ...previous,
        [bloodGroup]: {
          ...previous[bloodGroup],
          available: finalAvailable,
        },
      }))

      const updatedRequestState: BloodRequest = {
        id: pendingRequest.id,
        bloodGroup,
        units: requiredUnits,
        location: pendingRequest.location,
        status: fulfilled ? 'FULFILLED' : 'PENDING DONOR SUPPORT',
        initialAvailable: pendingRequest.initialAvailable,
        shortageUnits: fulfilled ? 0 : stillNeeded,
        bloodBankId: pendingRequest.bloodBankId ?? bloodBankId,
        hospitalId: pendingRequest.hospitalId,
        message: requestMessage,
      }

      if (fulfilled) {
        setLastRequest(updatedRequestState)
        setPendingRequest(null)
      } else {
        setPendingRequest(updatedRequestState)
        setLastRequest(updatedRequestState)
      }

      setHospitalRequests(previous =>
        previous.map(request =>
          request.id === pendingRequest.id
            ? {
              ...request,
              status: updatedRequestState.status,
              shortageUnits: updatedRequestState.shortageUnits,
              bloodBankId: pendingRequest.bloodBankId ?? bloodBankId,
              message: requestMessage,
            }
            : request,
        ),
      )

      alert(
        fulfilled
          ? 'Blood received, inventory updated, donation saved to AWS, and request fulfilled.'
          : 'Blood received, inventory updated, and donation saved to AWS. More donor support is still required.',
      )
    } catch (error) {
      console.error(
        'Failed to confirm blood received:',
        error,
      )
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to save the donation confirmation to AWS.',
      )
    }
  }


  if (profileLoading) return <div className="app"><section className="inventory-section"><div className="inventory-form"><h2>Loading your profile...</h2><p>Checking your BloodConnect account.</p></div></section></div>

  if (!profileReady && role !== 'ADMINS') {
    return (
      <ProfileSetup
        role={role}
        email={loginId}
        onComplete={async profile => {
          try {
            if (role === 'DONORS') {
              const donor = profile
              setDonors(previous => [
                ...previous.filter(item => item.id !== donor.id),
                {
                  id: donor.id,
                  name: donor.name,
                  email: donor.email,
                  phone: donor.phone,
                  bloodGroup: donor.bloodGroup,
                  location: donor.location,
                  donationStatus: donor.donationStatus as DonationStatus,
                  availability: donor.availability,
                  accountStatus: donor.accountStatus,
                },
              ])
            } else if (role === 'HOSPITALS') {
              setHospitalId(profile.id)
            } else if (role === 'BLOOD_BANKS') {
              setBloodBankId(profile.id)
              const { data: existingInventory } = await client.models.Inventory.list()
              const updatedInventory: Inventory = { ...initialInventory }
              const bankInventory = existingInventory.filter(item => item.bloodBankId === profile.id)
              for (const group of bloodGroups) {
                const existingItem = bankInventory.find(item => item.bloodGroup === group)
                if (existingItem) {
                  updatedInventory[group] = {
                    available: existingItem.availableUnits,
                    threshold: existingItem.threshold,
                    id: existingItem.id,
                  }
                } else {
                  const initialData = initialInventory[group]
                  const { data: newItem } = await client.models.Inventory.create({
                    bloodGroup: group,
                    availableUnits: initialData.available,
                    threshold: initialData.threshold,
                    bloodBankId: profile.id,
                  } as any)
                  if (newItem) {
                    updatedInventory[group] = {
                      available: newItem.availableUnits,
                      threshold: newItem.threshold,
                      id: newItem.id,
                    }
                  }
                }
              }
              setInventory(updatedInventory)
            }
            setProfileReady(true)
            setProfileLoading(false)
            setView(getRoleView(role))
          } catch (error) {
            console.error('Failed to initialize profile data:', error)
            alert('Profile was created, but some dashboard data could not be loaded. Please refresh once.')
            setProfileReady(true)
            setProfileLoading(false)
          }
        }}
      />
    )
  }

  if (view === 'home') {

    return (

      <div className="app">
        <header className="hero-section">

          <h1 className="project-name">

            BloodConnect

          </h1>

          <p className="tagline">

            Blood Availability, Donor Matching &

            Shortage Prevention

          </p>

        </header>



        <section className="capabilities-section">

          <h2>BloodConnect Dashboard</h2>



          <div className="capabilities-grid">

            <div className="capability-card">

              <h3>Current Role</h3>

              <p>{role}</p>

            </div>



            <div className="capability-card">

              <h3>Access</h3>

              <p>

                You are signed in with the BloodConnect

                role assigned to your account.

              </p>

            </div>

          </div>

        </section>

      </div>

    )

  }



  if (view === 'hospital') {

    const selectedBloodData = requestedBloodGroup

      ? inventory[requestedBloodGroup]

      : null



    const matchingDonors = getMatchingDonors()

    const acceptedDonors = getAcceptedDonors()

    const confirmedDonors = getConfirmedDonors()



    const remainingUnits = pendingRequest

      ? Math.max(

        pendingRequest.units -

        inventory[pendingRequest.bloodGroup].available,

        0,

      )

      : 0



    return (

      <div className="app role-app">
        <RoleSidebar role={role} />
        <main className="role-main">
          <header className="hero-section role-hero">

            <h1 className="project-name">

              BloodConnect

            </h1>

            <p className="tagline">

              Hospital Blood Supply Dashboard

            </p>

          </header>



          <section id="hospital-requests" className="inventory-table-container role-section">
            <h2>Hospital Blood Requests</h2>
            {hospitalRequests.length === 0 ? (
              <p>No blood requests have been submitted yet.</p>
            ) : (
              <table className="inventory-table">
                <thead><tr><th>Blood Group</th><th>Units</th><th>Location</th><th>Status</th></tr></thead>
                <tbody>
                  {hospitalRequests.map(request => (
                    <tr key={request.id}>
                      <td>{request.bloodGroup}</td>
                      <td>{request.unitsRequired}</td>
                      <td>{request.location}</td>
                      <td className={request.status === 'FULFILLED' ? 'normal-stock' : 'low-stock'}>{request.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section id="hospital-request-form" className="inventory-section role-section">

            <div className="inventory-form">

              <h2>Request Blood Supply</h2>



              <label htmlFor="requestedBloodGroup">

                Required Blood Group

              </label>



              <select

                id="requestedBloodGroup"

                value={requestedBloodGroup}

                onChange={event =>

                  setRequestedBloodGroup(

                    event.target.value,

                  )

                }

              >

                <option value="">

                  Select Blood Group

                </option>



                {bloodGroups.map(group => (

                  <option key={group} value={group}>

                    {group}

                  </option>

                ))}

              </select>



              {selectedBloodData && (

                <div className="availability-info">

                  <h3>Current Availability</h3>



                  <p>

                    Available Units:{' '}

                    <strong>

                      {selectedBloodData.available}

                    </strong>

                  </p>



                  <p>

                    Status:{' '}

                    <strong

                      className={

                        getStatus(

                          selectedBloodData.available,

                          selectedBloodData.threshold,

                        ) === 'LOW STOCK'

                          ? 'low-stock'

                          : 'normal-stock'

                      }

                    >

                      {getStatus(

                        selectedBloodData.available,

                        selectedBloodData.threshold,

                      )}

                    </strong>

                  </p>

                </div>

              )}



              <label htmlFor="requestedLocation">

                Hospital Location

              </label>



              <input

                id="requestedLocation"

                type="text"

                placeholder="Enter hospital location"

                value={requestedLocation}

                onChange={event =>

                  setRequestedLocation(

                    event.target.value,

                  )

                }

              />



              <label htmlFor="requestedUnits">

                Required Units

              </label>



              <input

                id="requestedUnits"

                type="number"

                min="1"

                value={requestedUnits}

                onChange={event =>

                  setRequestedUnits(

                    event.target.value === ''

                      ? ''

                      : Number(event.target.value),

                  )

                }

              />



              <button

                className="btn"

                onClick={handleBloodRequest}

              >

                Send Blood Request

              </button>



              {lastRequest && (

                <div className="request-result">

                  <h3>

                    Request Status:{' '}

                    <span

                      className={

                        lastRequest.status ===

                          'FULFILLED'

                          ? 'normal-stock'

                          : 'low-stock'

                      }

                    >

                      {lastRequest.status}

                    </span>

                  </h3>



                  <p>{lastRequest.message}</p>



                  <p>

                    <strong>

                      Request Location:

                    </strong>{' '}

                    {lastRequest.location}

                  </p>



                  {pendingRequest && (

                    <div className="availability-info">

                      <h3>

                        Donor Support Progress

                      </h3>



                      <p>

                        Matching Nearby Donors:{' '}

                        <strong>

                          {matchingDonors.length}

                        </strong>

                      </p>



                      <p>

                        Donors Accepted:{' '}

                        <strong>

                          {acceptedDonors.length}

                        </strong>

                      </p>



                      <p>

                        Confirmed Donations:{' '}

                        <strong>

                          {confirmedDonors.length}

                        </strong>

                      </p>



                      <p>

                        Units Still Required:{' '}

                        <strong className="low-stock">

                          {remainingUnits}

                        </strong>

                      </p>

                    </div>

                  )}

                </div>

              )}

            </div>



            <div id="hospital-availability" className="inventory-table-container role-section">

              <h2>Current Blood Availability</h2>



              <table className="inventory-table">

                <thead>

                  <tr>

                    <th>Blood Group</th>

                    <th>Available Units</th>

                    <th>Status</th>

                  </tr>

                </thead>



                <tbody>

                  {bloodGroups.map(group => {

                    const data = inventory[group]

                    const status = getStatus(

                      data.available,

                      data.threshold,

                    )



                    return (

                      <tr key={group}>

                        <td>{group}</td>

                        <td>{data.available}</td>

                        <td

                          className={

                            status === 'LOW STOCK'

                              ? 'low-stock'

                              : 'normal-stock'

                          }

                        >

                          {status}

                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

            </div>

          </section>

        </main>
      </div>

    )

  }



  if (view === 'administrator') {
    const dashboardInventory =
      Object.keys(adminInventory).length > 0
        ? adminInventory
        : initialInventory

    const totalBloodUnits =
      bloodGroups.reduce(
        (total, group) =>
          total + (dashboardInventory[group]?.available ?? 0),
        0,
      )

    const lowStockGroups = bloodGroups.filter(group => {
      const item = dashboardInventory[group]
      return Boolean(item) && getStatus(item.available, item.threshold) === 'LOW STOCK'
    })

    const pendingRequestsCount = hospitalRequests.filter(
      request => request?.status === 'PENDING DONOR SUPPORT',
    ).length

    const acceptedDonationsCount = donationRecords.filter(
      donation => donation.status === 'ACCEPTED',
    ).length

    const confirmedDonationsCount = donationRecords.filter(
      donation => donation.status === 'DONATED',
    ).length

    const pendingHospitals = hospitals.filter(
      item => (item?.verificationStatus ?? 'PENDING') === 'PENDING',
    )

    const approvedHospitals = hospitals.filter(
      item => item?.verificationStatus === 'APPROVED',
    )

    const rejectedHospitals = hospitals.filter(
      item => item?.verificationStatus === 'REJECTED',
    )

    return (
      <div className="app" style={{ minHeight: '100vh' }}>
        {/* ADMIN SIDE PANEL */}
        <aside
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '245px',
            background: '#111827',
            color: '#fff',
            padding: '28px 16px',
            boxSizing: 'border-box',
            zIndex: 20,
            boxShadow: '4px 0 18px rgba(15, 23, 42, 0.14)',
          }}
        >
          <div style={{ padding: '0 12px 28px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>BloodConnect</div>
            <div style={{ marginTop: '6px', color: '#cbd5e1', fontSize: '13px' }}>Administrator Portal</div>
          </div>

          <nav style={{ marginTop: '28px' }}>
            {[
              { key: 'dashboard' as const, icon: '▦', label: 'Dashboard' },
              { key: 'users' as const, icon: '👥', label: 'Registered Users', count: donors.length },
              { key: 'hospitals' as const, icon: '🏥', label: 'Registered Hospitals', count: hospitals.length },
            ].map(item => {
              const active = adminSection === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAdminSection(item.key)}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    background: active ? '#dc2626' : 'transparent',
                    color: '#fff',
                    padding: '13px 14px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 8px 18px rgba(220,38,38,0.24)' : 'none',
                  }}
                >
                  <span style={{ width: '22px', textAlign: 'center', fontSize: '17px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {typeof item.count === 'number' && (
                    <span
                      style={{
                        minWidth: '24px',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: active ? 'rgba(255,255,255,0.2)' : '#374151',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div
            style={{
              position: 'absolute',
              left: '16px',
              right: '16px',
              bottom: '24px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              color: '#cbd5e1',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#fff' }}>Admin access</strong>
            <br />
            Monitor blood stock, users and registered institutions.
          </div>
        </aside>

        {/* ADMIN CONTENT */}
        <main style={{ marginLeft: '245px', minHeight: '100vh' }}>
          <header className="hero-section" style={{ paddingTop: '48px' }}>
            <h1 className="project-name">BloodConnect</h1>
            <p className="tagline">System Oversight Dashboard</p>
          </header>

          {adminSection === 'dashboard' && (
            <>
              <section id="admin-dashboard" className="admin-dashboard">
                <div className="admin-card">
                  <h3>Total Blood Units</h3>
                  <p className="admin-number">{totalBloodUnits}</p>
                </div>
                <div className="admin-card">
                  <h3>Low Stock Groups</h3>
                  <p className="admin-number">{lowStockGroups.length}</p>
                </div>
                <div className="admin-card">
                  <h3>Registered Donors</h3>
                  <p className="admin-number">{donors.length}</p>
                </div>
                <div className="admin-card">
                  <h3>Registered Hospitals</h3>
                  <p className="admin-number">{hospitals.length}</p>
                </div>
                <div className="admin-card">
                  <h3>Pending Requests</h3>
                  <p className="admin-number">{pendingRequestsCount}</p>
                </div>
                <div className="admin-card">
                  <h3>Accepted Donations</h3>
                  <p className="admin-number">{acceptedDonationsCount}</p>
                </div>
                <div className="admin-card">
                  <h3>Confirmed Donations</h3>
                  <p className="admin-number">{confirmedDonationsCount}</p>
                </div>
              </section>

              <section className="admin-low-stock">
                <div className="inventory-table-container">
                  <h2>Institution Verification</h2>
                  <p>Review hospital and blood bank profiles before approving them for operational use.</p>

                  <h3>Hospitals</h3>
                  {pendingHospitals.length === 0 ? (
                    <p className="normal-stock">No pending hospital verifications.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="inventory-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Registration</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingHospitals.map(item => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.registrationNumber || '—'}</td>
                              <td>{item.location}</td>
                              <td>{item.verificationStatus}</td>
                              <td>
                                <button className="btn" disabled={verificationBusy === item.id} onClick={() => handleHospitalVerification(item.id, 'APPROVED')}>Approve</button>{' '}
                                <button className="btn" disabled={verificationBusy === item.id} onClick={() => handleHospitalVerification(item.id, 'REJECTED')}>Reject</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <h3>Blood Banks</h3>
                  {bloodBanks.filter(item => (item?.verificationStatus ?? 'PENDING') === 'PENDING').length === 0 ? (
                    <p className="normal-stock">No pending blood bank verifications.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="inventory-table">
                        <thead>
                          <tr><th>Name</th><th>Licence</th><th>Location</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {bloodBanks.filter(item => (item?.verificationStatus ?? 'PENDING') === 'PENDING').map(item => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.licenseNumber || '—'}</td>
                              <td>{item.location}</td>
                              <td>{item.verificationStatus}</td>
                              <td>
                                <button className="btn" disabled={verificationBusy === item.id} onClick={() => handleBloodBankVerification(item.id, 'APPROVED')}>Approve</button>{' '}
                                <button className="btn" disabled={verificationBusy === item.id} onClick={() => handleBloodBankVerification(item.id, 'REJECTED')}>Reject</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="admin-low-stock">
                <div className="inventory-table-container">
                  <h2>Low Stock Alerts</h2>
                  {lowStockGroups.length === 0 ? (
                    <p className="normal-stock">All blood groups have sufficient stock.</p>
                  ) : (
                    <table className="inventory-table">
                      <thead><tr><th>Blood Group</th><th>Available Units</th><th>Threshold</th><th>Status</th></tr></thead>
                      <tbody>
                        {lowStockGroups.map(group => (
                          <tr key={group}>
                            <td>{group}</td>
                            <td>{dashboardInventory[group].available}</td>
                            <td>{dashboardInventory[group].threshold}</td>
                            <td className="low-stock">LOW STOCK</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}

          {adminSection === 'users' && (
            <section id="admin-users" className="admin-low-stock role-section">
              <div className="inventory-table-container">
                <div className="section-heading-row">
                  <div>
                    <h2>Registered Users</h2>
                    <p className="section-subtitle">All donor profiles currently registered in BloodConnect.</p>
                  </div>
                  <span className="count-badge">{donors.length} Donor{donors.length !== 1 ? 's' : ''}</span>
                </div>

                {donors.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🩸</div>
                    <h3>No registered users</h3>
                    <p>Donor profiles will appear here after registration.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="inventory-table admin-donor-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Blood Group</th>
                          <th>Location</th>
                          <th>Phone</th>
                          <th>Donation Status</th>
                          <th>Account</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donors.map(donor => (
                          <tr key={donor.id}>
                            <td>
                              <div className="donor-name-cell">
                                <div className="donor-avatar">{donor.name?.charAt(0)?.toUpperCase() || 'D'}</div>
                                <div><strong>{donor.name}</strong><span>{donor.email}</span></div>
                              </div>
                            </td>
                            <td><span className="blood-group-badge">{donor.bloodGroup}</span></td>
                            <td>{donor.location}</td>
                            <td>{donor.phone || '—'}</td>
                            <td>
                              <span className={donor.donationStatus === 'DONATED' ? 'status-badge status-donated' : donor.donationStatus === 'ACCEPTED' ? 'status-badge status-accepted' : 'status-badge status-available'}>
                                {donor.donationStatus}
                              </span>
                            </td>
                            <td><span className="account-status-badge">{donor.accountStatus || 'ACTIVE'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {adminSection === 'hospitals' && (
            <section id="admin-hospitals" className="admin-low-stock role-section">
              <div className="inventory-table-container">
                <div className="section-heading-row">
                  <div>
                    <h2>Registered Hospitals</h2>
                    <p className="section-subtitle">All hospital profiles registered in BloodConnect.</p>
                  </div>
                  <span className="count-badge">{hospitals.length} Hospital{hospitals.length !== 1 ? 's' : ''}</span>
                </div>

                {hospitals.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏥</div>
                    <h3>No registered hospitals</h3>
                    <p>Hospital profiles will appear here after registration.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Hospital</th>
                          <th>Registration</th>
                          <th>Type</th>
                          <th>Contact Person</th>
                          <th>Location</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hospitals.map(hospital => (
                          <tr key={hospital.id}>
                            <td>
                              <div className="donor-name-cell">
                                <div className="donor-avatar">{hospital.name?.charAt(0)?.toUpperCase() || 'H'}</div>
                                <div><strong>{hospital.name}</strong><span>{hospital.email}</span></div>
                              </div>
                            </td>
                            <td>{hospital.registrationNumber || '—'}</td>
                            <td>{hospital.hospitalType || '—'}</td>
                            <td>{hospital.contactPerson || '—'}</td>
                            <td>{hospital.location || '—'}</td>
                            <td>{hospital.phone || '—'}</td>
                            <td>
                              <span className={hospital.verificationStatus === 'APPROVED' ? 'status-badge status-donated' : hospital.verificationStatus === 'REJECTED' ? 'status-badge status-accepted' : 'status-badge status-available'}>
                                {hospital.verificationStatus || 'PENDING'}
                              </span>
                            </td>
                            <td>
                              {(hospital.verificationStatus ?? 'PENDING') === 'PENDING' ? (
                                <>
                                  <button className="btn" disabled={verificationBusy === hospital.id} onClick={() => handleHospitalVerification(hospital.id, 'APPROVED')}>Approve</button>{' '}
                                  <button className="btn" disabled={verificationBusy === hospital.id} onClick={() => handleHospitalVerification(hospital.id, 'REJECTED')}>Reject</button>
                                </>
                              ) : (
                                <span className="section-subtitle">Reviewed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="availability-info" style={{ marginTop: '20px' }}>
                  <strong>Hospital registration summary:</strong> {approvedHospitals.length} approved · {pendingHospitals.length} pending · {rejectedHospitals.length} rejected
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    )
  }

  if (view === 'donor') {

    const matchingDonors =

      getMatchingDonors()



    return (

      <div className="app role-app">
        <RoleSidebar role={role} />
        <main className="role-main">
          <header className="hero-section role-hero">

            <h1 className="project-name">

              BloodConnect

            </h1>

            <p className="tagline">

              Donor Registration & Availability

            </p>

          </header>



          {pendingRequest && (

            <section id="donor-requests" className="matching-donors-section role-section">

              <div className="inventory-table-container">

                <h2>Urgent Blood Request</h2>



                <p>

                  A hospital in{' '}

                  <strong>

                    {pendingRequest.location}

                  </strong>{' '}

                  requires{' '}

                  <strong>

                    {pendingRequest.units} unit(s)

                  </strong>{' '}

                  of{' '}

                  <strong>

                    {pendingRequest.bloodGroup}

                  </strong>{' '}

                  blood.

                </p>



                <p>

                  The blood bank currently has{' '}

                  <strong>

                    {

                      inventory[

                        pendingRequest.bloodGroup

                      ].available

                    }

                  </strong>{' '}

                  unit(s). Matching donors in{' '}

                  <strong>

                    {pendingRequest.location}

                  </strong>{' '}

                  are requested to donate to the

                  blood bank.

                </p>



                {matchingDonors.length === 0 ? (

                  <p>

                    No matching donors are currently

                    available in this location.

                  </p>

                ) : (

                  <table className="inventory-table">

                    <thead>

                      <tr>

                        <th>Donor</th>

                        <th>Blood Group</th>

                        <th>Location</th>

                        <th>Status</th>

                        <th>Action</th>

                      </tr>

                    </thead>



                    <tbody>

                      {matchingDonors.map(

                        donor => (

                          <tr key={donor.id}>

                            <td>{donor.name}</td>

                            <td>

                              {donor.bloodGroup}

                            </td>

                            <td>{donor.location}</td>



                            <td

                              className={

                                donor.donationStatus ===

                                  'ACCEPTED'

                                  ? 'normal-stock'

                                  : ''

                              }

                            >

                              {donor.donationStatus}

                            </td>



                            <td>

                              {donor.donationStatus !== 'DONATED' &&
                                !donationRecords.some(
                                  donation =>
                                    donation.donorId === donor.id &&
                                    donation.bloodRequestId === pendingRequest.id &&
                                    (donation.status === 'ACCEPTED' || donation.status === 'DONATED'),
                                ) ? (

                                <button

                                  className="btn"

                                  onClick={() =>

                                    handleAcceptDonation(

                                      donor,

                                    )

                                  }

                                >

                                  Accept Donation

                                  Request

                                </button>

                              ) : (

                                <strong className="normal-stock">

                                  Waiting for Blood

                                  Bank

                                </strong>

                              )}

                            </td>

                          </tr>

                        ),

                      )}

                    </tbody>

                  </table>

                )}

              </div>

            </section>

          )}



          <section id="donor-profile" className="inventory-section role-section">
            <div className="inventory-form">
              <h2>Your Donor Profile</h2>
              {(() => {
                const me = donors.find(d => d.email.toLowerCase() === loginId.toLowerCase()); return <>
                  <p><strong>Name:</strong> {me?.name ?? '—'}</p><p><strong>Email:</strong> {me?.email ?? loginId}</p>
                  <p><strong>Blood Group:</strong> {me?.bloodGroup ?? '—'}</p><p><strong>Location:</strong> {me?.location ?? '—'}</p>
                  <p><strong>Donation Status:</strong> {me?.donationStatus ?? 'AVAILABLE'}</p>
                  <p className="availability-info">Your donor profile is linked to your authenticated Cognito account. Accepting a request does not mark the blood as donated; the blood bank confirms receipt.</p>
                </>
              })()}
            </div>

          </section>

        </main>
      </div>

    )

  }



  const acceptedEntries = getAcceptedEntries()



  return (

    <div className="app role-app">
      <RoleSidebar role={role} />
      <main className="role-main">
        <header className="hero-section role-hero">

          <h1 className="project-name">

            BloodConnect

          </h1>



          <p className="tagline">

            Blood Bank Inventory Dashboard

          </p>

        </header>



        <section id="bank-requests" className="inventory-table-container role-section">
          <h2>Hospital Blood Requests</h2>
          {hospitalRequests.length === 0 ? (
            <p>No hospital blood requests have been submitted.</p>
          ) : (
            <table className="inventory-table">
              <thead><tr><th>Blood Group</th><th>Units</th><th>Hospital Location</th><th>Status</th></tr></thead>
              <tbody>
                {hospitalRequests.map(request => (
                  <tr key={request.id}>
                    <td>{request.bloodGroup}</td>
                    <td>{request.unitsRequired}</td>
                    <td>{request.location}</td>
                    <td className={request.status === 'FULFILLED' ? 'normal-stock' : 'low-stock'}>{request.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section id="bank-donations" className="matching-donors-section role-section">
          <div className="inventory-table-container">
            <h2>Pending Donor Donations</h2>
            {acceptedEntries.length === 0 ? (
              <p>No donors have accepted a donation request yet.</p>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Blood Group</th>
                    <th>Location</th>
                    <th>Hospital Request</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedEntries.map(({ donation, donor, request }) => (
                    <tr key={donation.id}>
                      <td>{donor.name}</td>
                      <td>{donor.bloodGroup}</td>
                      <td>{donor.location}</td>
                      <td>{request.units} unit(s) of {request.bloodGroup} · {request.location}</td>
                      <td className="normal-stock">ACCEPTED</td>
                      <td>
                        <button
                          className="btn"
                          onClick={() => handleConfirmBloodReceived(donor, request)}
                        >
                          Confirm Blood Received
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section id="bank-inventory-form" className="inventory-section role-section">

          <div className="inventory-form">

            <h2>Add / Update Inventory</h2>



            <label htmlFor="bloodGroup">

              Blood Group

            </label>



            <select

              id="bloodGroup"

              value={formBloodGroup}

              onChange={event =>

                setFormBloodGroup(

                  event.target.value,

                )

              }

            >

              <option value="">

                Select Blood Group

              </option>



              {bloodGroups.map(group => (

                <option key={group} value={group}>

                  {group}

                </option>

              ))}

            </select>



            <label htmlFor="availableUnits">

              Available Units

            </label>



            <input

              id="availableUnits"

              type="number"

              min="0"

              value={formAvailableUnits}

              onChange={event =>

                setFormAvailableUnits(

                  event.target.value === ''

                    ? ''

                    : Number(event.target.value),

                )

              }

            />



            <label htmlFor="shortageThreshold">

              Shortage Threshold

            </label>



            <input

              id="shortageThreshold"

              type="number"

              min="0"

              value={formShortageThreshold}

              onChange={event =>

                setFormShortageThreshold(

                  event.target.value === ''

                    ? ''

                    : Number(event.target.value),

                )

              }

            />



            <button

              className="btn"

              onClick={handleSubmit}

            >

              Save / Update

            </button>

          </div>



          <div id="bank-inventory" className="inventory-table-container">

            <h2>Current Blood Inventory</h2>



            <table className="inventory-table">

              <thead>

                <tr>

                  <th>Blood Group</th>

                  <th>Available Units</th>

                  <th>Shortage Threshold</th>

                  <th>Status</th>

                </tr>

              </thead>



              <tbody>

                {bloodGroups.map(group => {

                  const data = inventory[group]



                  const status = getStatus(

                    data.available,

                    data.threshold,

                  )



                  return (

                    <tr key={group}>

                      <td>{group}</td>

                      <td>{data.available}</td>

                      <td>{data.threshold}</td>



                      <td

                        className={

                          status === 'LOW STOCK'

                            ? 'low-stock'

                            : 'normal-stock'

                        }

                      >

                        {status}

                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        </section>

      </main>
    </div>

  )

}



function RoleSidebar({ role }: { role: Role }) {
  const configs: Record<Role, { title: string; subtitle: string; items: { id: string; icon: string; label: string }[] }> = {
    ADMINS: {
      title: 'Administrator Portal', subtitle: 'System oversight', items: [
        { id: 'admin-dashboard', icon: '▦', label: 'Dashboard' },
        { id: 'admin-users', icon: '👥', label: 'Registered Users' },
        { id: 'admin-hospitals', icon: '🏥', label: 'Registered Hospitals' },
      ]
    },
    HOSPITALS: {
      title: 'Hospital Portal', subtitle: 'Blood supply management', items: [
        { id: 'hospital-requests', icon: '🩸', label: 'Blood Requests' },
        { id: 'hospital-request-form', icon: '➕', label: 'Request Blood' },
        { id: 'hospital-availability', icon: '📦', label: 'Blood Availability' },
      ]
    },
    BLOOD_BANKS: {
      title: 'Blood Bank Portal', subtitle: 'Inventory & donations', items: [
        { id: 'bank-requests', icon: '🏥', label: 'Hospital Requests' },
        { id: 'bank-donations', icon: '🩸', label: 'Donor Donations' },
        { id: 'bank-inventory-form', icon: '➕', label: 'Update Inventory' },
        { id: 'bank-inventory', icon: '📦', label: 'Blood Inventory' },
      ]
    },
    DONORS: {
      title: 'Donor Portal', subtitle: 'Donate & save lives', items: [
        { id: 'donor-requests', icon: '🚨', label: 'Donation Requests' },
        { id: 'donor-profile', icon: '👤', label: 'My Profile' },
      ]
    },
  }
  const config = configs[role]
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <aside className="role-sidebar">
      <div className="role-sidebar-brand">
        <div className="role-sidebar-logo">🩸</div>
        <div><div className="role-sidebar-title">BloodConnect</div><div className="role-sidebar-subtitle">{config.title}</div></div>
      </div>
      <nav className="role-sidebar-nav" aria-label="Dashboard navigation">
        {config.items.map(item => (
          <button key={item.id} type="button" className="role-sidebar-link" onClick={() => scrollTo(item.id)}>
            <span className="role-sidebar-icon">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="role-sidebar-footer"><strong>{config.subtitle}</strong><span>Use the navigation to move between sections.</span></div>
    </aside>
  )
}

function AuthenticatedBloodConnect({
  user,
  signOut,
}: {
  user: any
  signOut: () => void
}) {
  const [role, setRole] = useState<Role | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  const loginId = user?.signInDetails?.loginId?.trim() ?? ''

  useEffect(() => {
    let cancelled = false

    const loadRole = async () => {
      setLoadingRole(true)
      setRole(null)

      if (!loginId) {
        return
      }

      try {
        const session = await fetchAuthSession()
        const groups = session.tokens?.accessToken?.payload['cognito:groups']
        const userGroups = Array.isArray(groups) ? groups.map(String) : []
        const detectedRole = userGroups.find(group =>
          ['ADMINS', 'HOSPITALS', 'BLOOD_BANKS', 'DONORS'].includes(group),
        ) as Role | undefined

        if (!cancelled) {
          setRole(detectedRole ?? null)
          setLoadingRole(false)
        }
      } catch (error) {
        console.error('Failed to load Cognito role:', error)
        if (!cancelled) {
          setRole(null)
          setLoadingRole(false)
        }
      }
    }

    void loadRole()

    return () => {
      cancelled = true
    }
  }, [loginId])

  if (loadingRole || !loginId) {
    return <div className="app">Loading your BloodConnect account...</div>
  }

  if (!role) {
    return (
      <div className="app">
        <h2>No BloodConnect role assigned</h2>
        <p>This account has not been assigned to a BloodConnect role.</p>
        <button className="btn" onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 20px',
          background: '#f5f5f5',
        }}
      >
        <span>{loginId}</span>
        <span>Role: {role}</span>
        <button className="btn" onClick={signOut}>Sign Out</button>
      </div>

      <BloodConnectApp
        key={`${loginId}:${role}`}
        role={role}
        loginId={loginId}
      />
    </>
  )
}

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <AuthenticatedBloodConnect user={user} signOut={signOut} />
      )}
    </Authenticator>
  )
}

export default App
