
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from './auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Remove the login check to allow guest access
  return <>{children}</>;
};

export default ProtectedRoute;
