import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom';
import { authActions, privateKeyActions } from '../store';
import { apiRequest } from '../services/api';

function ProtectedRoute() {
  const dispatch = useDispatch();
  const { isAuthenticated, isChecking } = useSelector(state => state.auth);

  useEffect(() => {
    let active = true;
    async function validate() {
      try {
        const data = await apiRequest('/api/auth/validate');
        if (active) dispatch(authActions.login({ user: data.user }));
      } catch (error) {
        if (active) {
          dispatch(authActions.logout());
          dispatch(privateKeyActions.clearPrivateKey());
        }
      }
    }
    validate();
    return () => {
      active = false;
    };
  }, [dispatch]);

  if (isChecking) {
    return null;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to={'/auth'} replace />;
}

export default ProtectedRoute
