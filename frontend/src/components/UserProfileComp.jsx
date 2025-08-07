import React, { useEffect } from 'react'
import styles from '../styles/Profile.module.css'
import { useRef } from 'react';
import toast from 'react-hot-toast';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload';
import { updateProfile } from '../services/User';

function UserProfileComp({ user,setRefetch }) {
    useEffect(()=>{
        console.log("updated user: ",user);
    },[user]);
    const fileInputRef = useRef(null);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("Selected file:", file);
            try {
                let url = await uploadImageToCloudinary(file);
                let res = await updateProfile(url);
                if (url && res) {
                    toast.success("Updated profile photo");
                    setRefetch(true);
                }
            } catch (err) {
                console.log(err);
                toast.error("Error while updating profile pic");
            }
        }
    };

    return (
        <div className={styles.profileHeader}>
            <div className={styles.profilePhotoSection}>
                <div className={styles.profilePhoto}>
                    <img
                        src={user.profilePic}
                        className={styles.profilePhoto}
                        alt="No profile photo"
                    />
                </div>
                <button
                    className={styles.changePhotoBtn}
                    onClick={() => fileInputRef.current.click()}
                >📷
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
            {/* <UserProfileComp user={user}/> */}
            <div className={styles.profileInfo}>
                <h1>{user.fullName}</h1>
                <p>{user.email}</p>
                <div className={styles.statusBadge}>
                    <span className={styles.onlineIndicator}></span>
                    Online
                </div>
            </div>
        </div>
    )
}

export default UserProfileComp
