import React from 'react'
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Profile.module.css'
import { authActions } from '../store';

function LogoutComp() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleLogout = async () => {
        let res = await fetch('http://localhost:3000/api/auth/logout', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                "Content-type": "application/json"
            }
        });
        if (res.status == 200) {
            localStorage.removeItem("accessToken");
            dispatch(authActions.logout());
            toast.success("Logged out successfully");
            navigate("/");
        }

    };
    return (
        <div className={styles.logoutSection}>
            <button
                className={styles.logoutBtn}
                onClick={handleLogout}
            >
                <span className={styles.logoutIcon}>🚪</span>
                Logout
            </button>
        </div>
    )
}

export default LogoutComp
