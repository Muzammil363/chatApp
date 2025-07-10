import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom';
import { useNavigate,Navigate } from 'react-router-dom';

function ProtectedRoute() {
    const isAuthenticated=useSelector(state=>state.auth.isAuthenticated);
    const navigate=useNavigate();

  return (
    isAuthenticated?<Outlet/>:<Navigate to={'/auth'} replace/>
  )
}

export default ProtectedRoute
