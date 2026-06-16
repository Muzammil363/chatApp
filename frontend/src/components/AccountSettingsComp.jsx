import React, { useRef, useState } from 'react';
import styles from '../styles/Profile.module.css';
import { updateName } from '../services/User';
import toast from 'react-hot-toast';

function AccountSettingsComp({ setRefetch, setShowPasswordModal }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const fullName = useRef();

  const handleSave = async () => {
    const newName = fullName.current.value.trim();
    if (newName.length < 3) {
      toast.error('User name should be at least 3 characters long');
      return;
    }

    try {
      const res = await updateName(newName);
      if (res) {
        setIsEditingName(false);
        setRefetch(prev => !prev);
        toast.success('Updated username');
        return;
      }
      toast.error('Something went wrong');
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  return (
    <div className={styles.actionSection}>
      <h3>Account Settings</h3>
      <div className={styles.actionButtons}>
        <button
          className={styles.actionBtn}
          onClick={() => setShowPasswordModal(true)}
        >
          <span className={styles.actionIcon}>KEY</span>
          <div className={styles.actionText}>
            <h4>Change Password</h4>
            <p>Update your account password</p>
          </div>
          <span className={styles.actionArrow}>-&gt;</span>
        </button>

        <button className={styles.actionBtn} onClick={() => setIsEditingName(true)}>
          <span className={styles.actionIcon}>EDIT</span>
          <div className={styles.actionText}>
            <h4>Edit Username</h4>
            <p>Update what others call you</p>
          </div>
          <span className={styles.actionArrow}>-&gt;</span>
        </button>

        {isEditingName && (
          <div className={styles.editPanel}>
            <input
              type="text"
              placeholder="Enter new username"
              className={styles.searchInput}
              ref={fullName}
            />
            <div className={styles.editActions}>
              <button className={styles.acceptBtn} onClick={handleSave}>Save</button>
              <button className={styles.secondaryBtn} onClick={() => setIsEditingName(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountSettingsComp;
