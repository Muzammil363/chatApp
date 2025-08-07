import React, { useState, useEffect } from 'react';
import styles from '../styles/Profile.module.css';
import { fetchProfile } from '../services/User.js';
import SupportComp from '../components/SupportComp.jsx'
import LogoutComp from '../components/LogoutComp.jsx';
import AccountSettingsComp from '../components/AccountSettingsComp.jsx';
import PhotoModalComp from '../components/PhotoModalComp.jsx';
import UserProfileComp from '../components/UserProfileComp.jsx'

const Profile = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [user, setUser] = useState({});
  const [reFetch, setReFetch] = useState(false);

  useEffect(() => {
    async function loadData() {
      let data = await fetchProfile();
      console.log("setting user: ",data);
      setUser(data.profile);
    }
    loadData();
  }, [reFetch]);

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileContent}>
        <div className={styles.profileCard}>

          <UserProfileComp user={user} setRefetch={setReFetch}/>

          <div className={styles.profileActions}>
            <AccountSettingsComp setRefetch={setReFetch} setShowPasswordModal={setShowPasswordModal}/>
            <SupportComp />
            <LogoutComp />
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PhotoModalComp setShowPasswordModal={setShowPasswordModal}/>
      )}

    </div>
  );
};

export default Profile;