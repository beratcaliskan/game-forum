'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  FaUsers,
  FaComments,
  FaEye,
  FaFlag,
  FaCog,
  FaChartBar,
  FaShieldAlt,
  FaGamepad,
  FaBan,
  FaUnlock,
  FaThumbsUp,
  FaCalendar,
  FaExclamationTriangle,
  FaArrowLeft,
  FaFolder
} from 'react-icons/fa';
type AdminStats = {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  totalReports: number;
  todayUsers: number;
  todayThreads: number;
  todayPosts: number;
  pendingReports: number;
};
type RecentActivity = {
  id: string;
  type: 'user_register' | 'thread_create' | 'report_create' | 'user_banned';
  description: string;
  time: string;
  user?: string;
  username?: string;
  severity?: 'low' | 'medium' | 'high';
};
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalThreads: 0,
    totalPosts: 0,
    totalReports: 0,
    todayUsers: 0,
    todayThreads: 0,
    todayPosts: 0,
    pendingReports: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
          router.push('/auth/login');
          return;
        }
      if (user.role !== 'admin' && user.role !== 'moderator') {
          router.push('/');
          return;
        }
      fetchAdminData();
    }
  }, [user, authLoading, router]);
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} gün önce`;
    }
  };
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersStatsResult, threadsStatsResult, postsStatsResult, reportsStatsResult] = await Promise.all([
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        supabase.from('threads').select('id, created_at', { count: 'exact' }),
        supabase.from('posts').select('id, created_at', { count: 'exact' }),
        supabase.from('reports').select('id, created_at, status', { count: 'exact' })
      ]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const todayUsers = usersStatsResult.data?.filter(u => u.created_at >= todayISO).length || 0;
      const todayThreads = threadsStatsResult.data?.filter(t => t.created_at >= todayISO).length || 0;
      const todayPosts = postsStatsResult.data?.filter(p => p.created_at >= todayISO).length || 0;
      const pendingReports = reportsStatsResult.data?.filter(r => r.status === 'pending').length || 0;
        setStats({
        totalUsers: usersStatsResult.count || 0,
        totalThreads: threadsStatsResult.count || 0,
        totalPosts: postsStatsResult.count || 0,
        totalReports: reportsStatsResult.count || 0,
        todayUsers,
        todayThreads,
        todayPosts,
        pendingReports,
      });
      const [threadsResult, usersResult, reportsResult, postsResult] = await Promise.all([
        supabase
          .from('threads')
          .select(`
            id,
            title,
            created_at,
            profiles(username),
            categories(name)
          `)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('profiles')
          .select('username, created_at')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('reports')
          .select(`
            id,
            created_at,
            status,
            type,
            profiles(username)
          `)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('posts')
          .select(`
            id,
            created_at,
            profiles(username),
            threads(title)
          `)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);
      const activities: RecentActivity[] = [];
      if (usersResult.data) {
        usersResult.data.forEach((user, index) => {
          activities.push({
            id: `user_${index}`,
            type: 'user_register',
            description: `Yeni kullanıcı kaydoldu: @${user.username}`,
            time: formatTimeAgo(user.created_at),
            username: user.username,
            severity: 'low'
          });
        });
      }
      if (threadsResult.data) {
        threadsResult.data.forEach((thread: any, index) => {
          const categoryName = Array.isArray(thread.categories) ? thread.categories[0]?.name : thread.categories?.name;
          const authorName = Array.isArray(thread.profiles) ? thread.profiles[0]?.username : thread.profiles?.username;
          activities.push({
            id: `thread_${index}`,
            type: 'thread_create',
            description: `@${authorName || 'Bilinmeyen'} yeni konu açtı: "${thread.title ? (thread.title.length > 40 ? thread.title.substring(0, 40) + '...' : thread.title) : 'Başlık yok'}"${categoryName ? ` (${categoryName})` : ''}`,
            time: formatTimeAgo(thread.created_at),
            username: authorName,
            severity: 'low'
          });
        });
      }
      if (reportsResult.data) {
        reportsResult.data.forEach((report: any, index) => {
          const reporterName = Array.isArray(report.profiles) ? report.profiles[0]?.username : report.profiles?.username;
          activities.push({
            id: `report_${index}`,
            type: 'report_create',
            description: `@${reporterName || 'Bilinmeyen'} ${report.type === 'thread' ? 'konu' : report.type === 'post' ? 'gönderi' : 'profil'} şikayeti gönderdi`,
            time: formatTimeAgo(report.created_at),
            username: reporterName,
            severity: report.status === 'pending' ? 'medium' : 'low'
          });
        });
      }
      if (postsResult.data) {
        postsResult.data.forEach((post: any, index) => {
          const authorName = Array.isArray(post.profiles) ? post.profiles[0]?.username : post.profiles?.username;
          const threadTitle = Array.isArray(post.threads) ? post.threads[0]?.title : post.threads?.title;
          activities.push({
            id: `post_${index}`,
            type: 'thread_create',
            description: `@${authorName || 'Bilinmeyen'} "${threadTitle ? (threadTitle.length > 30 ? threadTitle.substring(0, 30) + '...' : threadTitle) : 'Başlık yok'}" konusuna yanıt verdi`,
            time: formatTimeAgo(post.created_at),
            username: authorName,
            severity: 'low'
          });
        });
      }
      activities.sort((a, b) => {
        const timeA = new Date(activities.find(act => act.id === a.id)?.time || '').getTime() || 0;
        const timeB = new Date(activities.find(act => act.id === b.id)?.time || '').getTime() || 0;
        return timeB - timeA;
      });
      setRecentActivity(activities.slice(0, 8));
      } catch (error) {
      console.error('Admin verileri alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_register': return <FaUsers className="text-blue-500" />;
      case 'thread_create': return <FaComments className="text-green-500" />;
      case 'report_create': return <FaFlag className="text-yellow-500" />;
      case 'user_banned': return <FaBan className="text-red-500" />;
      default: return <FaGamepad className="text-gray-500" />;
    }
  };
  const renderActivityDescription = (activity: RecentActivity) => {
    if (!activity.username) {
      return activity.description;
    }
    const parts = activity.description.split(`@${activity.username}`);
    return (
      <>
        {parts[0]}
        <Link 
          href={`/profile/${activity.username}`}
          className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
        >
          @{activity.username}
        </Link>
        {parts[1]}
      </>
    );
  };
  if (authLoading || loading) {
    return (
      <div className="bg-dark-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Admin paneli yükleniyor...</p>
        </div>
      </div>
    );
  }
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="bg-dark-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaShieldAlt className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Erişim Reddedildi</h1>
          <p className="text-gray-400 mb-4">Bu sayfaya erişim için admin veya moderatör yetkisi gereklidir.</p>
          <Link href="/" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-dark-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Panel
              {user.role === 'moderator' && (
                <span className="text-lg font-normal text-yellow-400 ml-2">(Moderatör)</span>
              )}
            </h1>
            <p className="text-gray-400">
              Hoş geldin, {user.username}! Forum yönetim paneline erişiyorsun.
            </p>
          </div>
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors"
          >
            <FaArrowLeft />
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <FaUsers className="text-blue-400 text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-400">Toplam Kullanıcı</h3>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-xs text-green-400">+{stats.todayUsers} bugün</p>
              </div>
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="bg-green-500/20 p-3 rounded-lg">
                <FaComments className="text-green-400 text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-400">Toplam Konu</h3>
                <p className="text-2xl font-bold text-white">{stats.totalThreads}</p>
                <p className="text-xs text-green-400">+{stats.todayThreads} bugün</p>
              </div>
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <FaEye className="text-purple-400 text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-400">Toplam Gönderi</h3>
                <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
                <p className="text-xs text-green-400">+{stats.todayPosts} bugün</p>
              </div>
            </div>
        </div>
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="bg-red-500/20 p-3 rounded-lg">
                <FaFlag className="text-red-400 text-xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-400">Bekleyen Rapor</h3>
                <p className="text-2xl font-bold text-white">{stats.pendingReports}</p>
                <p className="text-xs text-gray-400">{stats.totalReports} toplam</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-xl font-bold text-white mb-6">Hızlı İşlemler</h2>
              <div className="space-y-3">
                <Link 
                  href="/admin/users"
                  className="w-full flex items-center gap-3 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-lg transition-colors border border-dark-600 hover:border-primary-500/50"
                >
                  <FaUsers className="text-primary-400" />
                  <span>Kullanıcı Yönetimi</span>
                </Link>
                <Link 
                  href="/admin/reports"
                  className="w-full flex items-center gap-3 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-lg transition-colors border border-dark-600 hover:border-primary-500/50"
                >
                  <FaFlag className="text-red-400" />
                  <span>Raporları İncele</span>
                  {stats.pendingReports > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-auto">
                      {stats.pendingReports}
                    </span>
                  )}
                </Link>
                <Link 
                  href="/admin/threads"
                  className="w-full flex items-center gap-3 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-lg transition-colors border border-dark-600 hover:border-primary-500/50"
                >
                  <FaComments className="text-green-400" />
                  <span>Konu Yönetimi</span>
                </Link>
                {user.role === 'admin' && (
                  <>
                    <Link 
                      href="/admin/categories"
                      className="w-full flex items-center gap-3 bg-dark-700 hover:bg-dark-600 text-white p-3 rounded-lg transition-colors border border-dark-600 hover:border-primary-500/50"
                    >
                      <FaFolder className="text-orange-400" />
                      <span>Kategori Yönetimi</span>
                    </Link>
                  </>
                )}
              </div>
        </div>
      </div>
          <div className="lg:col-span-2">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-xl font-bold text-white mb-6">Son Etkinlikler</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg border border-dark-600">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{renderActivityDescription(activity)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">{activity.time}</p>
                        {activity.severity && (
                          <span className={`text-xs ${getSeverityColor(activity.severity)}`}>
                            •
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h2 className="text-xl font-bold text-white mb-4">Sistem Durumu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaChartBar className="text-green-400 text-xl" />
              </div>
              <h3 className="text-white font-medium">Sunucu Durumu</h3>
              <p className="text-green-400 text-sm">Çevrimiçi</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaCalendar className="text-blue-400 text-xl" />
              </div>
              <h3 className="text-white font-medium">Son Güncelleme</h3>
              <p className="text-gray-400 text-sm">2 gün önce</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaExclamationTriangle className="text-yellow-400 text-xl" />
              </div>
              <h3 className="text-white font-medium">Bekleyen İşlem</h3>
              <p className="text-yellow-400 text-sm">{stats.pendingReports} rapor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 