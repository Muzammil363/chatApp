import React from 'react'
import { useState } from 'react';
import styles from '../styles/Profile.module.css'
import toast from 'react-hot-toast';

function PhotoModalComp({setShowPasswordModal}) {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords did not match");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast("Password must be atleast 6 characters long");
            return;
        }
        // Here you would typically make an API call to change the password
        console.log('Password change request:', {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
        });
        alert('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const cancelPasswordChange = () => {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };


    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>Change Password</h3>
                    <button
                        className={styles.closeBtn}
                        onClick={cancelPasswordChange}
                    >
                        ✕
                    </button>
                </div>

                <form className={styles.modalForm} onSubmit={handlePasswordSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="currentPassword">Current Password</label>
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className={styles.inputField}
                            placeholder="Enter current password"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className={styles.inputField}
                            placeholder="Enter new password"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className={styles.inputField}
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={cancelPasswordChange}
                        >
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitBtn}>
                            Change Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PhotoModalComp
