import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3, RoleType } from '../context/Web3Context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { account, role } = useWeb3();

  if (!account) {
    // Not authenticated at all, redirect to home
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Authenticated but does not have required role, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
