import { useState } from 'react'
import { useProfileStore } from '../../hooks/useProfileStore'

export const ProfileSwitcher = () => {
  const { profiles, activeProfile, peerProfile, selectProfile, selectPeerProfile, createProfile } = useProfileStore()
  const [draftName, setDraftName] = useState('')
  const canCompete = profiles.length > 1

  const handleCreateProfile = () => {
    const trimmed = draftName.trim()
    createProfile(trimmed)
    setDraftName('')
  }

  return (
    <div className="profile-switcher">
      <div className="profile-switcher__group">
        <label htmlFor="active-profile">Logged in as</label>
        <select
          id="active-profile"
          value={activeProfile.id}
          onChange={(event) => selectProfile(event.target.value)}
        >
          {profiles.map((profile) => (
            <option value={profile.id} key={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
      <div className="profile-switcher__group profile-switcher__create">
        <label htmlFor="new-profile">Add teammate</label>
        <div className="profile-switcher__create-row">
          <input
            id="new-profile"
            type="text"
            value={draftName}
            placeholder="Name"
            onChange={(event) => setDraftName(event.target.value)}
          />
          <button type="button" onClick={handleCreateProfile} disabled={!draftName.trim()}>
            Add
          </button>
        </div>
      </div>
      {canCompete && (
        <div className="profile-switcher__group">
          <label htmlFor="peer-profile">Compete with</label>
          <select
            id="peer-profile"
            value={peerProfile?.id ?? ''}
            onChange={(event) => selectPeerProfile(event.target.value)}
          >
            <option value="">Solo mode</option>
            {profiles
              .filter((profile) => profile.id !== activeProfile.id)
              .map((profile) => (
                <option value={profile.id} key={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  )
}

export default ProfileSwitcher
