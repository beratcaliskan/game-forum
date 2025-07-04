'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaUser, FaSave, FaUpload } from 'react-icons/fa';
import { useAuth } from '../../../lib/AuthContext';
import { getUserProfile, DEFAULT_AVATAR_URL, supabase } from '../../../lib/supabase';
type ProfileFormData = {
  display_name: string;
  avatar_url: string;
  bio: string;
};
export default function ProfileSettingsPage() {
  const { user, loading, updateUserProfile } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    avatar_url: '',
    bio: ''
  });
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    display_name: '',
    avatar_url: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }
    const loadProfileData = async () => {
      if (user) {
        try {
          const profileData = await getUserProfile(user.id);
          if (profileData) {
            const formValues = {
              display_name: profileData.display_name || profileData.username,
              avatar_url: profileData.avatar_url || `${DEFAULT_AVATAR_URL}${encodeURIComponent(profileData.username)}`,
              bio: profileData.bio || ''
            };
            setFormData(formValues);
            setOriginalData(formValues);
            setProfileId(profileData.profile_id);
          }
        } catch (error) {
          console.error('Profil bilgileri yüklenirken hata oluştu:', error);
          setError('Profil bilgileri yüklenemedi.');
        }
      }
    };
    loadProfileData();
  }, [user, loading, router]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (success) setSuccess(false);
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        setError('Dosya boyutu 2MB\'dan büyük olamaz');
        e.target.value = '';
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Sadece resim dosyaları yüklenebilir');
        e.target.value = '';
        return;
      }
      
      setError(null);
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setAvatarPreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (success) setSuccess(false);
  };
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    
    // File size check (2MB limit)
    if (avatarFile.size > 2 * 1024 * 1024) {
      throw new Error('Dosya boyutu 2MB\'dan büyük olamaz');
    }
    
    // File type check
    if (!avatarFile.type.startsWith('image/')) {
      throw new Error('Sadece resim dosyaları yüklenebilir');
    }
    
    try {
      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      if (!fileExt || !allowedExts.includes(fileExt)) {
        throw new Error('Desteklenmeyen dosya formatı. PNG, JPG, GIF veya WebP formatında dosya yükleyin.');
      }
      
      const fileName = `${user.username}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Delete old avatar if exists
      if (formData.avatar_url && formData.avatar_url.includes('supabase')) {
        try {
          const oldPath = formData.avatar_url.split('/').pop();
          if (oldPath && oldPath !== fileName) {
            await supabase.storage
              .from('avatars')
              .remove([`avatars/${oldPath}`]);
          }
        } catch (cleanupError) {
          // Don't throw error for cleanup failure
          console.warn('Eski avatar silinirken hata:', cleanupError);
        }
      }
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) {
        console.error('Supabase storage error:', error);
        if (error.message.includes('Bucket not found')) {
          throw new Error('Storage yapılandırması eksik. Lütfen sistem yöneticisine başvurun.');
        }
        throw new Error(`Upload hatası: ${error.message}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Avatar yüklenirken hata:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('Avatar yüklenirken bilinmeyen bir hata oluştu');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileId) {
      setError('Kullanıcı bilgileri bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          avatar_url: avatarUrl,
          bio: formData.bio
        })
        .eq('id', profileId);
      if (updateError) throw updateError;
      setFormData(prev => ({
        ...prev,
        avatar_url: avatarUrl
      }));
      setOriginalData({
        display_name: formData.display_name,
        avatar_url: avatarUrl,
        bio: formData.bio
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccess(true);
      
      // Update AuthContext with new avatar and display name
      updateUserProfile(avatarUrl, formData.display_name);
    } catch (error: any) {
      console.error('Profil güncellenirken hata:', error);
      setError(error.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };
  const hasChanges = (): boolean => {
    return (
      formData.display_name !== originalData.display_name ||
      formData.bio !== originalData.bio ||
      avatarFile !== null
    );
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!user) return null;
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Profil Ayarları</h1>
        {error && (
          <div className="bg-red-800/50 border border-red-500 text-white px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-secondary-800/50 border border-secondary-500 text-white px-4 py-3 rounded-lg mb-6">
            Profiliniz başarıyla güncellendi!
          </div>
        )}
        <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-700">
                  {avatarPreview ? (
                    <Image 
                      src={avatarPreview} 
                      alt="Avatar Önizleme" 
                      width={128} 
                      height={128} 
                      className="object-cover w-full h-full"
                    />
                  ) : formData.avatar_url ? (
                    <Image 
                      src={formData.avatar_url} 
                      alt="Mevcut Avatar" 
                      width={128} 
                      height={128} 
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/20 text-primary-500">
                      <FaUser size={48} />
                    </div>
                  )}
                </div>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full cursor-pointer">
                  <FaUpload />
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">Profil Resmi</h2>
                <p className="text-gray-400 mb-3">PNG, JPG, GIF veya WebP formatında, maksimum 2MB boyutunda bir resim yükleyin.</p>
                {avatarFile && (
                  <div className="text-sm text-gray-300">
                    <div>Seçilen dosya: {avatarFile.name}</div>
                    <div>Boyut: {Math.round(avatarFile.size / 1024)} KB ({(avatarFile.size / (1024 * 1024)).toFixed(2)} MB)</div>
                    <div>Format: {avatarFile.type}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-300 mb-1">
                  Görünen Ad
                </label>
                <input 
                  type="text" 
                  id="display_name" 
                  name="display_name" 
                  value={formData.display_name} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                  required
                />
                <p className="mt-1 text-sm text-gray-400">
                  Bu, profilinizde ve gönderilerinizde görünecek adınızdır.
                </p>
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                  Hakkımda
                </label>
                <textarea 
                  id="bio" 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white resize-none"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Kendiniz hakkında kısa bir açıklama yazın. Bu alan isteğe bağlıdır.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                    hasChanges() 
                      ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer' 
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  } transition-colors ${saving ? 'opacity-70 pointer-events-none' : ''}`}
                  disabled={!hasChanges() || saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-primary-300"></div>
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Değişiklikleri Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 