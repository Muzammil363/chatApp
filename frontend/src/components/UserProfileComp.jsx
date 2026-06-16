import React, { useRef } from 'react';
import styles from '../styles/Profile.module.css';
import toast from 'react-hot-toast';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload';
import { updateProfile } from '../services/User';

function UserProfileComp({ user = {}, setRefetch }) {
  const fileInputRef = useRef(null);
  const initials = (user.fullName || user.email || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'C';

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const url = await uploadImageToCloudinary(file);
      const res = await updateProfile(url);
      if (url && res) {
        toast.success('Updated profile photo');
        setRefetch(prev => !prev);
      }
    } catch (err) {
      toast.error('Error while updating profile pic');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={styles.profileHeader}>
      <div className={styles.profilePhotoSection}>
        <div className={styles.profilePhoto}>
          {user.profilePic ? (
            <img src={user.profilePic} className={styles.profileImage} alt={user.fullName || 'Profile'} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <button
          className={styles.changePhotoBtn}
          onClick={() => fileInputRef.current.click()}
          aria-label="Change profile photo"
        >
          CAM
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.profileInfo}>
        <span className={styles.profileLabel}>My profile</span>
        <h1>{user.fullName || 'CipherChat User'}</h1>
        <p>{user.email || 'Profile loading...'}</p>
        <div className={styles.statusBadge}>
          <span className={styles.onlineIndicator}></span>
          Online
        </div>
      </div>
    </div>
  );
}

export default UserProfileComp;
