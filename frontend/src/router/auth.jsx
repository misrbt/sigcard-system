import { lazy } from 'react';
import { Route } from 'react-router-dom';
import AuthLayout from '@layouts/AuthLayout';

const Login = lazy(() => import('@/Login'));

// Import auth pages here
// import Register from '../../pages/auth/Register';
// import ForgotPassword from '../../pages/auth/ForgotPassword';
// etc...

const AuthRoutes = () => {
  return (
    <>
      <Route
        path="/login"
        element={<Login />}
      />
      <Route
        path="/register"
        element={
          <AuthLayout title="Create Account" subtitle="Sign up for DIGICUR">
            {/* <Register /> */}
            <div>Register Page - Coming Soon</div>
          </AuthLayout>
        }
      />
      {/* Add more auth routes here */}
      {/* <Route path="/forgot-password" element={<AuthLayout title="Reset Password"><ForgotPassword /></AuthLayout>} /> */}
    </>
  );
};

export default AuthRoutes;
