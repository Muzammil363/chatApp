import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Profile.module.css';
import { authActions, privateKeyActions } from '../store';
import toast from 'react-hot-toast';
import { apiRequest } from '../services/api';

function LogoutComp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'DELETE'
      });
      dispatch(authActions.logout());
      dispatch(privateKeyActions.clearPrivateKey());
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className={styles.logoutSection}>
      <button className={styles.logoutBtn} onClick={handleLogout}>
        <span className={styles.logoutIcon}>OUT</span>
        Logout
      </button>
    </div>
  );
}

export default LogoutComp;
