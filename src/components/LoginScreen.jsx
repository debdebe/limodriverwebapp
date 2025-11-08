import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn
  } = useAuth();
  const { toast } = useToast();
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
    if (rememberMe && identifier && password && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      attemptLogin(identifier, password);
    }
  }, [rememberMe, identifier, password, autoLoginAttempted]);

  const normalizePhone = (value) => value.replace(/\D/g, '');

  const resolveEmailForIdentifier = async (value) => {
    if (!value) throw new Error('Please enter your email or phone number.');
    const trimmed = value.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }

    const raw = trimmed;
    const normalized = normalizePhone(trimmed);

    // Try exact match first
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
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedIdentifier');
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('savedPassword');
    }
  };

  const attemptLogin = async (loginIdentifier, loginPassword) => {
    setIsLoading(true);
    try {
      const resolvedEmail = await resolveEmailForIdentifier(loginIdentifier);
      const { error } = await signIn(resolvedEmail, loginPassword);

      if (error) {
        return false;
      }

      handleRememberStorage(rememberMe, loginIdentifier, resolvedEmail, loginPassword);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Unable to sign in with the provided credentials.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async e => {
    e.preventDefault();
    setAutoLoginAttempted(true);
    await attemptLogin(identifier, password);
  };
  return <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6
    }} className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <motion.div initial={{
          opacity: 0,
          y: -20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2,
          duration: 0.6
        }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Blairstown Limousine</h1>
            <p className="text-gray-300">Professional Driver Portal</p>
          </motion.div>

          

          <motion.form initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.6,
          duration: 0.6
        }} onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-white">Email or Phone</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="remember" className="flex items-center space-x-2 text-sm text-gray-300 select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => {
                    setRememberMe(e.target.checked);
                    setAutoLoginAttempted(true);
                  }}
                  className="h-4 w-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-3 rounded-lg transition-all duration-200">
              {isLoading ? <motion.div animate={{
              rotate: 360
            }} transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : 'Sign In'}
            </Button>
          </motion.form>

          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.8,
          duration: 0.6
        }} className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Need help? Contact your fleet manager
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>;
};
export default LoginScreen;