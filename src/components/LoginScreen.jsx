import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Lock, Mail, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const RECOVERY_MIN_PASSWORD_LENGTH = 8;

const LoginScreen = ({ forcedMode = 'login' }) => {
  const [view, setView] = useState(forcedMode === 'reset' ? 'reset' : 'login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { signIn } = useAuth();
  const { toast } = useToast();

  const isRecoveryLink = () => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    return window.location.hash.includes('type=recovery') || searchParams.get('type') === 'recovery';
  };

  const clearRecoveryParamsFromUrl = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('type');
    url.searchParams.delete('access_token');
    url.searchParams.delete('refresh_token');
    url.searchParams.delete('expires_at');
    url.searchParams.delete('expires_in');
    url.searchParams.delete('token_type');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  };

  useEffect(() => {
    if (forcedMode === 'reset' || isRecoveryLink()) {
      setView('reset');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, [forcedMode]);

  useEffect(() => {
    const storedRemember = localStorage.getItem('rememberMe') === 'true';
    const storedIdentifier = localStorage.getItem('savedIdentifier');
    const storedEmail = localStorage.getItem('savedEmail');
    const storedPassword = localStorage.getItem('savedPassword');

    if (storedRemember && storedPassword && (storedIdentifier || storedEmail)) {
      setRememberMe(true);
      setIdentifier(storedIdentifier || storedEmail);
      setPassword(storedPassword);
    }
  }, []);

  useEffect(() => {
    if (!rememberMe) {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedIdentifier');
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('savedPassword');
    }
  }, [rememberMe]);

  useEffect(() => {
    if (view !== 'login') return;
    if (rememberMe && identifier && password && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      attemptLogin(identifier, password);
    }
  }, [view, rememberMe, identifier, password, autoLoginAttempted]);

  useEffect(() => {
    if (forcedMode === 'reset') {
      setView('reset');
      return;
    }
    if (!isRecoveryLink()) {
      setView((currentView) => (currentView === 'reset' ? 'login' : currentView));
    }
  }, [forcedMode]);

  const normalizePhone = (value) => value.replace(/\D/g, '');

  const resolveEmailForIdentifier = async (value) => {
    if (!value) throw new Error('Please enter your email or phone number.');
    const trimmed = value.trim();
    if (trimmed.includes('@')) return trimmed;

    const raw = trimmed;
    const normalized = normalizePhone(trimmed);

    let response = await supabase
      .from('users')
      .select('email, phone')
      .eq('phone', raw)
      .maybeSingle();

    if ((response.error || !response.data) && normalized) {
      response = await supabase
        .from('users')
        .select('email, phone')
        .eq('phone', normalized)
        .maybeSingle();
    }

    if (response.error || !response.data?.email) {
      throw new Error('No account found for this phone number.');
    }

    return response.data.email;
  };

  const handleRememberStorage = (shouldRemember, loginIdentifier, loginEmail, loginPassword) => {
    if (shouldRemember) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('savedIdentifier', loginIdentifier);
      localStorage.setItem('savedEmail', loginEmail);
      localStorage.setItem('savedPassword', loginPassword);
      return;
    }

    localStorage.removeItem('rememberMe');
    localStorage.removeItem('savedIdentifier');
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedPassword');
  };

  const attemptLogin = async (loginIdentifier, loginPassword) => {
    setIsSigningIn(true);
    try {
      const resolvedEmail = await resolveEmailForIdentifier(loginIdentifier);
      const { error } = await signIn(resolvedEmail, loginPassword);

      if (error) return false;

      handleRememberStorage(rememberMe, loginIdentifier, resolvedEmail, loginPassword);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Sign in Failed',
        description: error.message || 'Unable to sign in with the provided credentials.',
      });
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAutoLoginAttempted(true);
    await attemptLogin(identifier, password);
  };

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    setIsSendingReset(true);
    try {
      const email = await resolveEmailForIdentifier(identifier);
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      toast({
        title: 'Reset link sent',
        description: `A password reset link was sent to ${email}.`,
      });
      setView('login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not send reset link',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword.length < RECOVERY_MIN_PASSWORD_LENGTH) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: `Use at least ${RECOVERY_MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please check both password fields and try again.',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'Your password has been reset successfully. Please sign in again.',
      });

      clearRecoveryParamsFromUrl();
      setNewPassword('');
      setConfirmPassword('');
      setView('login');
      await supabase.auth.signOut();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Password update failed',
        description: error.message || 'Please request a new password reset link.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const viewHeader = {
    login: {
      icon: <Car className="w-8 h-8 text-white" />,
      subtitle: 'Professional Driver Portal',
    },
    forgot: {
      icon: <KeyRound className="w-8 h-8 text-white" />,
      subtitle: 'Send a secure reset link',
    },
    reset: {
      icon: <Lock className="w-8 h-8 text-white" />,
      subtitle: 'Create a new secure password',
    },
  }[view];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              {viewHeader.icon}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Blairstown Limousine</h1>
            <p className="text-gray-300">{viewHeader.subtitle}</p>
          </motion.div>

          {view === 'login' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-white">
                  Email or Phone
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone number"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="remember"
                  className="flex items-center space-x-2 text-sm text-gray-300 select-none"
                >
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      setAutoLoginAttempted(true);
                    }}
                    className="h-4 w-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-200 hover:text-white transition-colors"
                  onClick={() => setView('forgot')}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isSigningIn}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-3 rounded-lg transition-all duration-200"
              >
                {isSigningIn ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Sign In'
                )}
              </Button>
            </motion.form>
          )}

          {view === 'forgot' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onSubmit={handleSendResetLink}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="forgot-identifier" className="text-white">
                  Email or Phone
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="forgot-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone number"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSendingReset}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-3 rounded-lg transition-all duration-200"
              >
                {isSendingReset ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('login')}
                className="w-full text-gray-200 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </motion.form>
          )}

          {view === 'reset' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onSubmit={handlePasswordUpdate}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={`Minimum ${RECOVERY_MIN_PASSWORD_LENGTH} characters`}
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((show) => !show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((show) => !show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-3 rounded-lg transition-all duration-200"
              >
                {isUpdatingPassword ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Update Password'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  clearRecoveryParamsFromUrl();
                  setView('login');
                  await supabase.auth.signOut();
                }}
                className="w-full text-gray-200 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel Recovery
              </Button>
            </motion.form>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-center mt-6"
          >
            <p className="text-gray-400 text-sm">Need help? Contact your fleet manager</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
