import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Camera, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const MyAccount = ({ user, onLogout }) => {
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.avatar_path) {
      const downloadImage = async () => {
        const { data, error } = await supabase.storage.from('limonjphoto').download(user.avatar_path);
        if (error) {
          console.error('Error downloading image: ', error.message);
          return;
        }
        const url = URL.createObjectURL(data);
        setAvatarUrl(url);
      };
      downloadImage();
    }
  }, [user?.avatar_path]);

  const handlePhotoUpdate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUpdatingPhoto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('limonjphoto')
      .upload(filePath, file);

    if (uploadError) {
      toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
      setIsUpdatingPhoto(false);
      return;
    }

    const { error: updateUserError } = await supabase
      .from('users')
      .update({ avatar_path: filePath, avatar_uploaded_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateUserError) {
      toast({ variant: "destructive", title: "Update failed", description: updateUserError.message });
    } else {
      toast({ title: "Profile photo updated!" });
      // Refresh avatar
      const { data, error } = await supabase.storage.from('limonjphoto').download(filePath);
      if (!error) {
        setAvatarUrl(URL.createObjectURL(data));
      }
    }
    setIsUpdatingPhoto(false);
  };

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-white text-xl font-semibold mb-4"
      >
        My Account
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={user.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"
            >
              {isUpdatingPhoto ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpdate}
                disabled={isUpdatingPhoto}
                className="hidden"
              />
            </label>
          </div>
          
          <div className="flex-1">
            <h3 className="text-white text-xl font-semibold">{user.name}</h3>
            <p className="text-gray-300">Professional Driver</p>
            <div className="flex items-center space-x-2 mt-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Verified Driver</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white">{user.phone}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-white font-semibold mb-4">App Information</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Build</span>
            <span className="text-white">2024.1</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Last Updated</span>
            <span className="text-white">Today</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Developed by</span>
            <a href="https://jorasoft.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Jorasoft</a>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={() => {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
            localStorage.removeItem('savedPassword');
            onLogout();
          }}
          variant="destructive"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
};

export default MyAccount;