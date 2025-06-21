'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaUser, FaCalendarAlt, FaEnvelope, FaEdit, FaGamepad, FaComments, FaHeart, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { getUserProfile, DEFAULT_AVATAR_URL, getUserLatestThreads, getUserLatestPosts } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
type UserStats = {
  threadCount: number;
  postCount: number;
  likeCount: number;
  followerCount: number;
  joined: string | null;
};
type UserProfile = {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  display_name: string;
  bio: string;
  profile_id: number | null;
  stats: UserStats;
};
type ThreadWithCategory = {
  id: number;
  title: string;
  created_at: string;
  categories?: {
    name: string;
  };
  posts?: {
    count: number;
  };
};
type PostWithThread = {
  id: number;
  content: string;
  created_at: string;
  threads?: {
    id: number;
    title: string;
  };
  likes?: {
    count: number;
  };
};
export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [recentThreads, setRecentThreads] = useState<ThreadWithCategory[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostWithThread[]>([]);
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }
    const fetchUserData = async () => {
      if (user) {
        setUserLoading(true);
        setActivitiesLoading(true);
        try {
          console.log('Fetching profile data for user:', user.id);
          const profileData = await getUserProfile(user.id);
          if (profileData) {
            setProfile(profileData);
            console.log('Profile data:', profileData);
            if (profileData.profile_id) {
              try {
                const [threads, posts] = await Promise.all([
                  getUserLatestThreads(profileData.profile_id),
                  getUserLatestPosts(profileData.profile_id)
                ]);
                console.log('Fetched threads:', threads);
                console.log('Fetched posts:', posts);
                setRecentThreads(threads);
                setRecentPosts(posts);
              } catch (activityError) {
                console.error('Aktiviteler alınırken hata:', activityError);
              }
            } else {
              console.error('Profil ID bulunamadı');
            }
          } else {
            console.error('Profil bilgileri alınamadı');
            setProfile({
              ...user,
              display_name: user.username,
              bio: '',
              profile_id: null,
              stats: {
                threadCount: 0,
                postCount: 0,
                likeCount: 0,
                followerCount: 0,
                joined: 'Bilinmiyor'
              }
            });
          }
        } catch (error) {
          console.error('Profil bilgileri alınırken hata:', error);
        } finally {
          setUserLoading(false);
          setActivitiesLoading(false);
        }
      }
    };
    fetchUserData();
  }, [user, loading, router]);
  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!user || !profile) return null;
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700 shadow-lg">
          <div className="h-48 bg-gradient-to-r from-primary-700 to-primary-500 relative">
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-dark-800/90 to-transparent"></div>
          </div>
          <div className="px-6 pt-0 pb-6 relative">
            <div className="absolute -top-16 left-6 w-32 h-32 rounded-full border-4 border-dark-800 overflow-hidden bg-dark-700">
              {profile.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt={profile.username} 
                  width={128} 
                  height={128} 
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image 
                  src={`${DEFAULT_AVATAR_URL}${encodeURIComponent(profile.username)}`}
                  alt={profile.username} 
                  width={128} 
                  height={128} 
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <div className="ml-36 flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2">
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
                <div className="text-gray-400">@{profile.username}</div>
                <div className="flex items-center text-gray-400 mt-1">
                  <FaUser className="mr-2" />
                  <span>{profile.role === 'admin' ? 'Yönetici' : (profile.role === 'moderator' ? 'Moderatör' : 'Üye')}</span>
                  <span className="mx-2">•</span>
                  <FaCalendarAlt className="mr-2" />
                  <span>Katılma: {profile.stats.joined}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <Link
                  href="/settings/profile"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaEdit />
                  <span>Profili Düzenle</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-xl font-semibold text-white mb-4">Kişisel Bilgiler</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Kullanıcı Adı</div>
                  <div className="text-white">{profile.username}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">E-posta</div>
                  <div className="flex items-center">
                    <FaEnvelope className="text-primary-500 mr-2" />
                    <span className="text-white">{profile.email}</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Rol</div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      profile.role === 'admin' 
                        ? 'bg-primary-500 text-white' 
                        : profile.role === 'moderator' 
                          ? 'bg-accent-500 text-white'
                          : 'bg-secondary-500 text-white'
                    }`}>
                      {profile.role === 'admin' 
                        ? 'Yönetici' 
                        : profile.role === 'moderator' 
                          ? 'Moderatör'
                          : 'Üye'}
                    </span>
                  </div>
                </div>
                {profile.bio && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Hakkımda</div>
                    <div className="text-white">{profile.bio}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 mt-6">
              <h2 className="text-xl font-semibold text-white mb-4">İstatistikler</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
                      <FaGamepad />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-400">Açılan Konular</div>
                      <div className="font-semibold text-white">{profile.stats.threadCount}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-secondary-500/20 flex items-center justify-center text-secondary-500">
                      <FaComments />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-400">Gönderiler</div>
                      <div className="font-semibold text-white">{profile.stats.postCount}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-500">
                      <FaHeart />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-400">Alınan Beğeniler</div>
                      <div className="font-semibold text-white">{profile.stats.likeCount}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
                      <FaUsers />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-400">Takipçiler</div>
                      <div className="font-semibold text-white">{profile.stats.followerCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Son Konularım</h2>
              {activitiesLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="border-t border-dark-700 py-4 first:border-t-0 first:pt-0 last:pb-0">
                    <div className="h-6 bg-dark-700 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-dark-700 rounded w-1/2 animate-pulse"></div>
                  </div>
                ))
              ) : recentThreads.length > 0 ? (
                recentThreads.map(thread => (
                  <div key={thread.id} className="border-t border-dark-700 py-4 first:border-t-0 first:pt-0 last:pb-0">
                    <h3 className="text-lg font-semibold text-white hover:text-primary-500 transition-colors">
                      <Link href={`/forum/thread/${thread.id}`}>{thread.title}</Link>
                    </h3>
                    <div className="flex items-center text-sm text-gray-400 mt-2">
                      <span>
                        {formatDistanceToNow(new Date(thread.created_at), {
                          addSuffix: true,
                          locale: tr
                        })}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{thread.categories?.name}</span>
                      <span className="mx-2">•</span>
                      <span>{thread.posts?.count || 0} yanıt</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">Henüz konu açmamışsınız.</p>
              )}
              <div className="mt-4 text-center">
                <Link href="/forum" className="text-primary-500 hover:text-primary-400">
                  Tüm konularımı görüntüle →
                </Link>
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-xl font-semibold text-white mb-4">Son Gönderilerim</h2>
              {activitiesLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="border-t border-dark-700 py-4 first:border-t-0 first:pt-0 last:pb-0">
                    <div className="h-4 bg-dark-700 rounded w-1/2 mb-2 animate-pulse"></div>
                    <div className="h-16 bg-dark-700 rounded w-full animate-pulse"></div>
                  </div>
                ))
              ) : recentPosts.length > 0 ? (
                recentPosts.map(post => (
                  <div key={post.id} className="border-t border-dark-700 py-4 first:border-t-0 first:pt-0 last:pb-0">
                    <div className="text-sm text-gray-400 mb-1">
                      <Link href={`/forum/thread/${post.threads?.id}`} className="hover:text-primary-500">
                        {post.threads?.title}
                      </Link>
                      <span className="mx-2">•</span>
                      <span>
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: tr
                        })}
                      </span>
                    </div>
                    <p className="text-gray-300">{post.content}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-400">
                      <FaHeart className="text-red-500 mr-1" />
                      <span>{post.likes?.count || 0} beğeni</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">Henüz gönderi yapmamışsınız.</p>
              )}
              <div className="mt-4 text-center">
                <Link href="/forum" className="text-primary-500 hover:text-primary-400">
                  Tüm gönderilerimi görüntüle →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 