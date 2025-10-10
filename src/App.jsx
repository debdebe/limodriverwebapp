import React from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import LoginScreen from '@/components/LoginScreen';
import MainApp from '@/components/MainApp';
import BossApp from '@/components/BossApp';
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { session, profile, loading, signOut } = useAuth();

  const renderAppForRole = () => {
    if (!session || !profile) {
      return (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
        >
          <LoginScreen />
        </motion.div>
      );
    }

    if (profile.role === 'Driver') {
      return (
        <motion.div
          key="driver-main"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <MainApp user={profile} onLogout={signOut} />
        </motion.div>
      );
    }

    if (profile.role === 'Boss') {
      return (
        <motion.div
          key="boss-main"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <BossApp user={profile} onLogout={signOut} />
        </motion.div>
      );
    }

    // Fallback or a screen for unassigned roles
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
          <h1 className="text-2xl font-bold mb-4">Role Not Assigned</h1>
          <p className="text-center mb-6">Your account role is not configured for this application. Please contact support.</p>
          <button onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Sign Out
          </button>
        </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Limo - Professional Limo Service Management</title>
        <meta name="description" content="Professional limousine service management application for trip tracking, earnings, and customer service." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <AnimatePresence mode="wait">
          {renderAppForRole()}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;