import React from 'react'
import { useState,useRef } from 'react';
import styles from '../styles/Profile.module.css'
import { updateName } from '../services/User';
import toast from 'react-hot-toast';

function AccountSettingsComp({setRefetch,setShowPasswordModal}) {
    const [isEditingName, setIsEditingName] = useState(false);
    const fullName = useRef();

    const handleSave = async () => {
        let newName = fullName.current.value;
        setIsEditingName(false);
        if (newName.trim().length < 2) {
            toast.error("User name should be atleast 3 characters long");
            return;
        }
        let res = await updateName(newName);
        if (res) {
            setRefetch(false);
            toast.success("Updated username ");
            return;
        }
        toast.error("Something went wrong");
    }
    return (
        <div className={styles.actionSection}>
            <h3>Account Settings</h3>
            <div className={styles.actionButtons}>
                <button
                    className={styles.actionBtn}
                    onClick={() => setShowPasswordModal(true)}
                >
                    <span className={styles.actionIcon}>🔒</span>
                    <div className={styles.actionText}>
                        <h4>Change Password</h4>
                        <p>Update your account password</p>
                    </div>
                    <span className={styles.actionArrow}>→</span>
                </button>

                <button className={styles.actionBtn} onClick={() => setIsEditingName(true)}>
                    <span className={styles.actionIcon}>✏️</span>
                    <div className={styles.actionText}>
                        <h4>Edit UserName</h4>
                        <p>Update what other's call you</p>
                    </div>
                    <span className={styles.actionArrow}>→</span>
                </button>
                {isEditingName &&
                    <div className={styles.actionBtn}>
                        <input
                            type="text"
                            placeholder='Enter new UserName'
                            className={styles.searchInput}
                            ref={fullName}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={styles.acceptBtn}
                                onClick={handleSave}
                            >Save
                            </button>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => { setIsEditingName(false) }}
                            >Cancel
                            </button>
                        </div>
                    </div>}
            </div>
        </div>
    )
}

export default AccountSettingsComp
