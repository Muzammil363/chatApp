import React, { useState,useEffect } from 'react';
import styles from '../styles/Profile.module.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authActions } from '../store/index.js';
import { fetchProfile } from '../services/User.js';
import { updateName } from '../services/User.js';
import { useRef } from 'react';

const Profile = () => {
  const navigate=useNavigate();
  const dispatch=useDispatch();
  const fullName=useRef();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isEditingName,setIsEditingName]=useState(false);
  const [user, setUser] = useState({});
  const [reFetch,setReFetch]=useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const profilePhotos = ['👤', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓', '👨‍⚕️', '👩‍⚕️', '👨‍🎨', '👩‍🎨', '👨‍🔬', '👩‍🔬', '👨‍🏫', '👩‍🏫', '🧑‍💼'];

  useEffect(()=>{
    async function loadData() {
      let data=await fetchProfile();
      setUser(data.profile);
    }
    loadData();
  },[reFetch]);

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
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

  const handlePhotoSelect = (photo) => {
    setUser({ ...user, profilePhoto: photo });
    setShowPhotoModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    dispatch(authActions.logout());
    toast.success("Logged out successfully");
    navigate("/");
  };

  const cancelPasswordChange = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSave=async ()=>{
    let newName=fullName.current.value;
    setIsEditingName(false);
    if(newName.trim().length<2) {
      toast.error("User name should be atleast 3 characters long");
      return ;
    }
    let res=await updateName(newName);
    if(res) {
      toast.success("Updated username to ",newName);
      setReFetch(true);
      return ;
    }
    toast.error("Something went wrong");
  }

  return (
    <div className={styles.profileContainer}>
      {/* Profile Content */}
      <div className={styles.profileContent}>
        <div className={styles.profileCard}>
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <div className={styles.profilePhotoSection}>
              <div className={styles.profilePhoto}>
                <span>{user.profilePhoto}</span>
              </div>
              <button 
                className={styles.changePhotoBtn}
                onClick={() => setShowPhotoModal(true)}
              >
                📷
              </button>
            </div>
            <div className={styles.profileInfo}>
              <h1>{user.fullName}</h1>
              <p>{user.email}</p>
              <div className={styles.statusBadge}>
                <span className={styles.onlineIndicator}></span>
                Online
              </div>
            </div>
          </div>

          {/* Profile Actions */}
          <div className={styles.profileActions}>
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

                <button className={styles.actionBtn} onClick={()=>setIsEditingName(true)}>
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
                    <div style={{display:'flex', gap:'10px'}}>
                      <button 
                        className={styles.acceptBtn}
                        onClick={handleSave}
                      >Save
                      </button>
                      <button 
                        className={styles.secondaryBtn}
                        onClick={()=>{setIsEditingName(false)}}
                      >Cancel
                      </button>
                    </div>
                </div>}

                <button className={styles.actionBtn}>
                  <span className={styles.actionIcon}>🔔</span>
                  <div className={styles.actionText}>
                    <h4>Notifications</h4>
                    <p>Manage notification preferences</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </button>

                <button className={styles.actionBtn}>
                  <span className={styles.actionIcon}>🔐</span>
                  <div className={styles.actionText}>
                    <h4>Privacy & Security</h4>
                    <p>Control your privacy settings</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </button>
              </div>
            </div>

            <div className={styles.actionSection}>
              <h3>Support</h3>
              <div className={styles.actionButtons}>
                <button className={styles.actionBtn}>
                  <span className={styles.actionIcon}>❓</span>
                  <div className={styles.actionText}>
                    <h4>Help Center</h4>
                    <p>Get help and support</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </button>

                <button className={styles.actionBtn}>
                  <span className={styles.actionIcon}>📞</span>
                  <div className={styles.actionText}>
                    <h4>Contact Support</h4>
                    <p>Reach out to our team</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </button>
              </div>
            </div>

            <div className={styles.logoutSection}>
              <button 
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                <span className={styles.logoutIcon}>🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
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
      )}

      {/* Profile Photo Selection Modal */}
      {showPhotoModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Choose Profile Photo</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowPhotoModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.photoGrid}>
              {profilePhotos.map((photo, index) => (
                <button
                  key={index}
                  className={`${styles.photoOption} ${user.profilePhoto === photo ? styles.selected : ''}`}
                  onClick={() => handlePhotoSelect(photo)}
                >
                  <span>{photo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;