'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaUser,
  FaCalendarAlt,
  FaGamepad,
  FaComments,
  FaHeart,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaClock,
  FaUserPlus,
  FaEnvelope,
  FaFlag,
  FaUsers
} from 'react-icons/fa';
import { supabase, validateToken, followUser, unfollowUser, checkFollowStatus, getFollowCounts } from '../../../lib/supabase';
import { MarkdownText } from '../../../lib/markdown';
import ReportModal from '../../../components/ReportModal';
import FollowModal from '../../../components/FollowModal';
type UserProfile = {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  role: string;
  created_at: string;
  views: number;
};
type UserStats = {
  threadCount: number;
  postCount: number;
  totalLikes: number;
  totalViews: number;
  followerCount: number;
  followingCount: number;
};
type Thread = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author_id: number;
  category_id: number;
  is_pinned: boolean;
  is_locked: boolean;
  view_count?: number;
  categories?: {
    id: number;
    name: string;
  };
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  _count?: {
    posts: number;
  };
};
type UserPost = {
  id: number;
  content: string;
  created_at: string;
  thread_id: number;
  threads?: {
    id: number;
    title: string;
  };
  likes?: { count: number }[];
  position?: number;
};
export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    threadCount: 0,
    postCount: 0,
    totalLikes: 0,
    totalViews: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'threads' | 'posts'>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPrivacySettings, setUserPrivacySettings] = useState<any>(null);
  const [privacySettingsLoaded, setPrivacySettingsLoaded] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const { user, error } = await validateToken(token);
      if (!error && user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Current user fetch error:', error);
    }
  };
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          username,
          role,
          created_at
        `)
        .eq('username', username)
        .single();
      if (userError || !userData) {
        console.error('User not found:', userError);
        setUserNotFound(true);
        setLoading(false);
        setPrivacySettingsLoaded(true);
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, bio, views')
        .eq('user_id', userData.id)
        .single();
      const userProfile = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        created_at: userData.created_at,
        display_name: profileData?.display_name || userData.username,
        avatar_url: profileData?.avatar_url || '',
        bio: profileData?.bio || '',
        views: profileData?.views || 0
      };
      setProfile(userProfile as UserProfile);
      const isOwnProfile = currentUser && currentUser.username === userData.username;
      if (!isOwnProfile) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ views: (profileData?.views || 0) + 1 })
            .eq('user_id', userData.id);
          if (error) {
            console.error('Error incrementing profile views:', error);
          }
        } catch (error) {
          console.error('Error incrementing profile views:', error);
        }
      }
      try {
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userData.id)
          .single();
        if (!error && settings) {
          setUserPrivacySettings({
            show_likes: settings.show_likes,
            show_followers: settings.show_followers,
            show_following: settings.show_following,
            show_online_status: settings.show_online_status,
            show_profile_to_guests: settings.show_profile_to_guests,
            allow_messages: settings.allow_messages
          });
        } else {
          setUserPrivacySettings({
            show_likes: true,
            show_followers: true,
            show_following: true,
            show_online_status: true,
            show_profile_to_guests: true,
            allow_messages: true
          });
        }
      } catch (settingsError) {
        console.error('Error loading privacy settings:', settingsError);
        setUserPrivacySettings({
          show_likes: true,
          show_followers: true,
          show_following: true,
          show_online_status: true,
          show_profile_to_guests: true,
          allow_messages: true
        });
      }
      setPrivacySettingsLoaded(true);
      await fetchUserStats(userData.id);
      await fetchUserContent(userData.id);
      if (currentUser && currentUser.id !== userData.id) {
        const followStatus = await checkFollowStatus(currentUser.id, userData.id);
        if (!followStatus.error) {
          setIsFollowing(followStatus.isFollowing);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchUserStats = async (userId: number) => {
    try {
      const { count: threadCount } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId);
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId);
      const { data: viewData } = await supabase
        .from('threads')
        .select('view_count')
        .eq('author_id', userId);
      const totalViews = viewData?.reduce((sum, thread) => sum + (thread.view_count || 0), 0) || 0;
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId);
      let totalLikes = 0;
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(post => post.id);
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);
        totalLikes = likeCount || 0;
      }
      const followCounts = await getFollowCounts(userId);
      setStats({
        threadCount: threadCount || 0,
        postCount: postCount || 0,
        totalLikes,
        totalViews,
        followerCount: followCounts.followerCount || 0,
        followingCount: followCounts.followingCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  const fetchUserContent = async (userId: number) => {
    try {
      const { data: threadsData, error: threadsError } = await supabase
        .from('threads')
        .select(`
          id,
          title,
          content,
          view_count,
          created_at,
          categories (
            name
          )
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!threadsError && threadsData) {
        const threadsWithCounts = await Promise.all(
          threadsData.map(async (thread: any) => {
            const { count } = await supabase
              .from('posts')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id);
            return {
              id: thread.id,
              title: thread.title,
              content: thread.content,
              created_at: thread.created_at,
              author_id: thread.author_id || 0,
              category_id: thread.category_id || 0,
              is_pinned: thread.is_pinned || false,
              is_locked: thread.is_locked || false,
              view_count: thread.view_count || 0,
              categories: Array.isArray(thread.categories) ? thread.categories[0] : thread.categories,
              profiles: thread.profiles,
              _count: { posts: count || 0 }
            } as Thread;
          })
        );
        setThreads(threadsWithCounts as any);
      }
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          thread_id,
          threads:thread_id (
            id,
            title
          )
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!postsError && postsData) {
        const postsWithLikes = await Promise.all(
          postsData.map(async (post) => {
            const { count } = await supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);
            const { count: postPosition } = await supabase
              .from('posts')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', post.thread_id)
              .lt('created_at', post.created_at);
            return {
              ...post,
              threads: Array.isArray(post.threads) ? post.threads[0] : post.threads,
              likes: [{ count: count || 0 }],
              position: (postPosition || 0) + 1
            };
          })
        );
        setPosts(postsWithLikes);
      }
    } catch (error) {
      console.error('Error fetching user content:', error);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    return formatDate(dateString);
  };
  const removeQuotes = (content: string) => {
    return content
      .split('\n')
      .filter(line => !line.trim().startsWith('>'))
      .join('\n')
      .trim();
  };
  const handleProfileReport = () => {
    if (!profile) return;
    setReportModalOpen(true);
  };
  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const result = await unfollowUser(currentUser.id, profile.id);
        if (!result.error) {
          setIsFollowing(false);
          setStats(prev => ({
            ...prev,
            followerCount: Math.max(0, prev.followerCount - 1)
          }));
        }
      } else {
        const result = await followUser(currentUser.id, profile.id);
        if (!result.error) {
          setIsFollowing(true);
          setStats(prev => ({
            ...prev,
            followerCount: prev.followerCount + 1
          }));
        }
      }
    } catch (error) {
      console.error('Follow işlemi hatası:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  const openFollowModal = (type: 'followers' | 'following') => {
    setFollowModalType(type);
    setFollowModalOpen(true);
  };
  useEffect(() => {
    if (username) {
      fetchUserProfile();
      getCurrentUser();
    }
  }, [username]);
  useEffect(() => {
    if (currentUser && profile && currentUser.id !== profile.id) {
      const checkFollow = async () => {
        const followStatus = await checkFollowStatus(currentUser.id, profile.id);
        if (!followStatus.error) {
          setIsFollowing(followStatus.isFollowing);
        }
      };
      checkFollow();
    }
  }, [currentUser, profile]);
  if (loading || !privacySettingsLoaded) {
    return (
      <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }
  if (!profile || userNotFound) {
    return (
      <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-dark-700 rounded-full flex items-center justify-center mb-6 border-4 border-dashed border-gray-600">
                <FaUser className="text-6xl text-gray-500" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Kullanıcı Bulunamadı</h1>
              <p className="text-xl text-gray-400 mb-2">
                <span className="text-primary-400 font-mono">@{username}</span> adlı kullanıcı mevcut değil.
              </p>
              <p className="text-gray-500 mb-8">
                Kullanıcı adını kontrol edin veya aradığınız kişi hesabını silmiş olabilir.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors border border-dark-600"
              >
                <FaArrowLeft />
                Geri Dön
              </button>
              <Link
                href="/forum"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <FaGamepad />
                Forum'a Git
              </Link>
              <Link
                href="/admin/users"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FaUsers />
                Tüm Kullanıcılar
              </Link>
            </div>
            <div className="mt-12 p-6 bg-dark-800 rounded-xl border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-3">Öneriler</h3>
              <div className="text-sm text-gray-400 space-y-2 text-left">
                <p>• Kullanıcı adının doğru yazıldığından emin olun</p>
                <p>• Büyük/küçük harf duyarlılığını kontrol edin</p>
                <p>• Forum üyeler listesinden aradığınız kişiyi bulabilirsiniz</p>
                <p>• Hesap silinmiş veya askıya alınmış olabilir</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const isProfileOwner = currentUser && currentUser.username === profile.username;
  const isGuest = !currentUser;
  const isProfilePrivate = userPrivacySettings && !userPrivacySettings.show_profile_to_guests;
  if (isProfilePrivate && isGuest) {
    return (
      <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
                         <FaUser className="mx-auto text-6xl text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Özel Profil</h1>
            <p className="text-gray-400 mb-6">
              Bu profil gizlidir. İçeriği görüntülemek için giriş yapmanız gerekir.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FaUser />
                Giriş Yap
              </Link>
              <Link
                href="/forum"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaArrowLeft />
                Forum'a Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <FaArrowLeft />
            Geri Dön
          </button>
        </div>
        <div className="bg-dark-700 rounded-xl p-8 border border-dark-600 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-primary-500/20">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary-400">
                    <FaUser size={48} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {profile.display_name}
                  </h1>
                  <p className="text-lg text-gray-300 mb-2">@{profile.username}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-xs" />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        profile.role === 'admin' ? 'bg-red-500 text-white' :
                        profile.role === 'moderator' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {profile.role === 'admin' ? 'Admin' :
                         profile.role === 'moderator' ? 'Moderatör' : 'Üye'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-xs" />
                      <span>{formatDate(profile.created_at)} tarihinde katıldı</span>
                    </div>
                  </div>
                </div>
                {currentUser && currentUser.username !== profile.username && (
                  <div className="flex gap-3">
                    {userPrivacySettings?.show_followers !== false && (
                      <button 
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          isFollowing 
                            ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                        } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FaUserPlus />
                        <span>{followLoading ? 'Yükleniyor...' : isFollowing ? 'Takip Ediliyor' : 'Takip Et'}</span>
                      </button>
                    )}
                    <button 
                      onClick={handleProfileReport}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaFlag />
                      <span>Şikayet</span>
                    </button>
                  </div>
                )}
              </div>
              {profile.bio && (
                <div className="mb-4">
                  <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-dark-600 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center text-primary-400 mb-2">
                    <FaGamepad size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.threadCount}</div>
                  <div className="text-sm text-gray-400">Konu</div>
                </div>
                <div className="bg-dark-600 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center text-blue-400 mb-2">
                    <FaComments size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.postCount}</div>
                  <div className="text-sm text-gray-400">Yorum</div>
                </div>
                {(isProfileOwner || userPrivacySettings?.show_likes) && (
                  <div className="bg-dark-600 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center text-red-400 mb-2">
                      <FaHeart size={20} />
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalLikes}</div>
                    <div className="text-sm text-gray-400">Beğeni</div>
                  </div>
                )}
                <div className="bg-dark-600 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center text-green-400 mb-2">
                    <FaEye size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.totalViews}</div>
                  <div className="text-sm text-gray-400">Konu Görüntüleme</div>
                </div>
                <div className="bg-dark-600 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center text-purple-400 mb-2">
                    <FaUser size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{profile.views+1}</div>
                  <div className="text-sm text-gray-400">Profil Görüntüleme</div>
                </div>
                <button
                  onClick={() => {
                    if (isProfileOwner || userPrivacySettings?.show_followers) {
                      openFollowModal('followers');
                    }
                  }}
                  className={`bg-dark-600 rounded-lg p-4 text-center transition-colors ${
                    (isProfileOwner || userPrivacySettings?.show_followers) 
                      ? 'hover:bg-dark-500 cursor-pointer' 
                      : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-center text-blue-500 mb-2">
                    <FaUsers size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.followerCount}</div>
                  <div className="text-sm text-gray-400">Takipçi</div>
                </button>
                <button
                  onClick={() => {
                    if (isProfileOwner || userPrivacySettings?.show_following) {
                      openFollowModal('following');
                    }
                  }}
                  className={`bg-dark-600 rounded-lg p-4 text-center transition-colors ${
                    (isProfileOwner || userPrivacySettings?.show_following) 
                      ? 'hover:bg-dark-500 cursor-pointer' 
                      : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-center text-indigo-500 mb-2">
                    <FaUserPlus size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.followingCount}</div>
                  <div className="text-sm text-gray-400">Takip Edilen</div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
          <div className="flex border-b border-dark-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-600'
              }`}
            >
              Genel Bakış
            </button>
            <button
              onClick={() => setActiveTab('threads')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'threads'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-600'
              }`}
            >
              Konuları ({stats.threadCount})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-600'
              }`}
            >
              Yorumları ({stats.postCount})
            </button>
          </div>
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {threads.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Son Konuları</h3>
                    <div className="space-y-3">
                      {threads.slice(0, 3).map((thread) => (
                        <Link
                          key={thread.id}
                          href={`/forum/thread/${thread.id}`}
                          className="block bg-dark-600 rounded-lg p-4 hover:bg-dark-500 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-white hover:text-primary-400 transition-colors">
                              {thread.title}
                            </h4>
                            {thread.categories && (
                              <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">
                                {thread.categories.name}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-300 mb-3 line-clamp-2">
                            <MarkdownText>
                              {thread.content.substring(0, 150)}
                            </MarkdownText>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <FaEye />
                              <span>{thread.view_count} görüntüleme</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaComments />
                              <span>{thread._count?.posts || 0} yorum</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaClock />
                              <span>{formatRelativeTime(thread.created_at)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {posts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Son Yorumları</h3>
                    <div className="space-y-3">
                      {posts.slice(0, 3).map((post) => (
                        <Link
                          key={post.id}
                          href={`/forum/thread/${post.threads?.id}#${post.position}`}
                          className="block bg-dark-600 rounded-lg p-4 hover:bg-dark-500 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-white hover:text-primary-400 transition-colors">
                              {post.threads?.title}
                            </h4>
                          </div>
                          <div className="text-sm text-gray-300 mb-3 line-clamp-2">
                            <MarkdownText>
                              {removeQuotes(post.content).substring(0, 150)}
                            </MarkdownText>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <FaHeart />
                              <span>{post.likes?.[0]?.count || 0} beğeni</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaClock />
                              <span>{formatRelativeTime(post.created_at)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {threads.length === 0 && posts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Henüz bir aktivite yok.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'threads' && (
              <div>
                {threads.length > 0 ? (
                  <div className="space-y-4">
                    {threads.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/forum/thread/${thread.id}`}
                        className="block bg-dark-600 rounded-lg p-4 hover:bg-dark-500 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-white hover:text-primary-400 transition-colors">
                            {thread.title}
                          </h4>
                          {thread.categories && (
                            <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded">
                              {thread.categories.name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-300 mb-3 line-clamp-2">
                          <MarkdownText>
                            {thread.content.substring(0, 200) + '...'}
                          </MarkdownText>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <FaEye />
                            <span>{thread.view_count} görüntüleme</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaComments />
                            <span>{thread._count?.posts || 0} yorum</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaClock />
                            <span>{formatRelativeTime(thread.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Henüz bir konu açmamış.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'posts' && (
              <div>
                {posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/forum/thread/${post.threads?.id}#${post.position}`}
                        className="block bg-dark-600 rounded-lg p-4 hover:bg-dark-500 transition-colors"
                      >
                        <div className="mb-2">
                          <h4 className="font-medium text-white hover:text-primary-400 transition-colors">
                            {post.threads?.title}
                          </h4>
                          <span className="text-xs text-gray-500">konusunda yorum yaptı</span>
                        </div>
                        <div className="text-sm text-gray-300 mb-3 line-clamp-3">
                          <MarkdownText>
                            {removeQuotes(post.content).substring(0, 200) + '...'}
                          </MarkdownText>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <FaHeart />
                            <span>{post.likes?.[0]?.count || 0} beğeni</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaClock />
                            <span>{formatRelativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Henüz bir yorum yapmamış.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportType="profile"
          targetId={profile?.id}
          targetTitle={profile?.display_name || profile?.username || ''}
        />
        <FollowModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          userId={profile?.id || 0}
          type={followModalType}
          title={followModalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
        />
      </div>
    </div>
  );
}
 