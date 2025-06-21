'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  FaArrowLeft,
  FaComments,
  FaEye,
  FaEdit,
  FaTrash,
  FaLock,
  FaUnlock,
  FaSearch,
  FaFilter,
  FaThumbtack,
  FaExternalLinkAlt,
  FaFlag
} from 'react-icons/fa';
const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?name=';

interface Category {
  id: number;
  name: string;
}

interface Thread {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  author: {
    username: string;
    avatar_url?: string;
    role: string;
  };
  category: {
    id: number;
    name: string;
  };
  stats: {
    post_count: number;
    like_count: number;
  };
}

export default function ThreadsManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/admin');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router]);
  useEffect(() => {
    let filtered = [...threads];
    if (searchTerm) {
      filtered = filtered.filter(thread => 
        thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.author.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(thread => thread.category.id.toString() === categoryFilter);
    }
    if (statusFilter === 'pinned') {
      filtered = filtered.filter(thread => thread.is_pinned);
    } else if (statusFilter === 'locked') {
      filtered = filtered.filter(thread => thread.is_locked);
    } else if (statusFilter === 'normal') {
      filtered = filtered.filter(thread => !thread.is_pinned && !thread.is_locked);
    }
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'views':
        filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'activity':
        filtered.sort((a, b) => b.stats.post_count - a.stats.post_count);
        break;
    }
    setFilteredThreads(filtered);
  }, [threads, searchTerm, categoryFilter, statusFilter, sortBy]);
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      setCategories(categoriesData || []);
      const { data: threadsData, error } = await supabase
        .from('threads')
        .select(`
          id,
          title,
          content,
          created_at,
          updated_at,
          view_count,
          is_pinned,
          is_locked,
          category_id,
          author_id,
          profiles!threads_author_id_fkey (
            username,
            avatar_url,
            role
          ),
          categories (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const threadsWithStats = await Promise.all(
        threadsData.map(async (threadData) => {
          const [postsResult, likesResult] = await Promise.all([
            supabase
              .from('posts')
              .select('id', { count: 'exact' })
              .eq('thread_id', threadData.id),
            supabase
              .from('likes')
              .select('id', { count: 'exact' })
              .eq('thread_id', threadData.id)
          ]);
          return {
            id: threadData.id,
            title: threadData.title,
            content: threadData.content,
            created_at: threadData.created_at,
            updated_at: threadData.updated_at,
            view_count: threadData.view_count || 0,
            is_pinned: threadData.is_pinned || false,
            is_locked: threadData.is_locked || false,
            author: {
              username: (threadData.profiles as any)?.username || 'Deleted User',
              avatar_url: (threadData.profiles as any)?.avatar_url,
              role: (threadData.profiles as any)?.role || 'user'
            },
            category: {
              id: (threadData.categories as any)?.id || 0,
              name: (threadData.categories as any)?.name || 'Unknown'
            },
            stats: {
              post_count: postsResult.count || 0,
              like_count: likesResult.count || 0
            }
          } as Thread;
        })
      );
      setThreads(threadsWithStats);
    } catch (error) {
      console.error('Konular alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleTogglePin = async (threadId: number, currentState: boolean) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('threads')
        .update({ is_pinned: !currentState })
        .eq('id', threadId);
      if (error) throw error;
      setThreads(threads.map(thread => 
        thread.id === threadId ? { ...thread, is_pinned: !currentState } : thread
      ));
    } catch (error) {
      console.error('Pin durumu güncellenirken hata:', error);
      alert('Pin durumu güncellenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };
  const handleToggleLock = async (threadId: number, currentState: boolean) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('threads')
        .update({ is_locked: !currentState })
        .eq('id', threadId);
      if (error) throw error;
      setThreads(threads.map(thread => 
        thread.id === threadId ? { ...thread, is_locked: !currentState } : thread
      ));
    } catch (error) {
      console.error('Kilit durumu güncellenirken hata:', error);
      alert('Kilit durumu güncellenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };
  const handleDeleteThread = async () => {
    if (!selectedThread) return;
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', selectedThread.id);
      if (error) throw error;
      setThreads(threads.filter(thread => thread.id !== selectedThread.id));
      setShowDeleteModal(false);
      setSelectedThread(null);
    } catch (error) {
      console.error('Konu silinirken hata:', error);
      alert('Konu silinirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400';
      case 'moderator': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (authLoading || loading) {
    return (
      <div className="bg-dark-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Konular yükleniyor...</p>
        </div>
      </div>
    );
  }
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="bg-dark-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Bu sayfaya erişim yetkiniz yok</p>
          <Link href="/admin" className="text-primary-400 hover:text-primary-300">
            Admin paneline dön
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-dark-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin"
              className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors"
            >
              <FaArrowLeft />
              <span>Admin Panel</span>
            </Link>
            <div className="w-px h-6 bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <FaComments className="text-green-400" />
              <h1 className="text-2xl font-bold text-white">Konu Yönetimi</h1>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {filteredThreads.length} / {threads.length} konu
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Toplam Konu</p>
                <p className="text-2xl font-bold text-white">{threads.length}</p>
              </div>
              <FaComments className="text-primary-400 text-xl" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Sabitlenmiş</p>
                <p className="text-2xl font-bold text-blue-400">
                  {threads.filter(t => t.is_pinned).length}
                </p>
              </div>
              <FaThumbtack className="text-blue-400 text-xl" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Kilitli</p>
                <p className="text-2xl font-bold text-red-400">
                  {threads.filter(t => t.is_locked).length}
                </p>
              </div>
              <FaLock className="text-red-400 text-xl" />
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Toplam Görüntülenme</p>
                <p className="text-2xl font-bold text-green-400">
                  {threads.reduce((sum, t) => sum + t.view_count, 0)}
                </p>
              </div>
              <FaEye className="text-green-400 text-xl" />
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Konu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-dark-900 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(category => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-dark-900 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="normal">Normal</option>
              <option value="pinned">Sabitlenmiş</option>
              <option value="locked">Kilitli</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-dark-900 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="newest">En Yeni</option>
              <option value="oldest">En Eski</option>
              <option value="title">Başlık</option>
              <option value="views">Görüntülenme</option>
              <option value="activity">Aktivite</option>
            </select>
          </div>
        </div>
        <div className="space-y-4">
          {filteredThreads.map((thread) => (
            <div key={thread.id} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {thread.is_pinned && (
                      <FaThumbtack className="text-blue-400 text-sm" />
                    )}
                    {thread.is_locked && (
                      <FaLock className="text-red-400 text-sm" />
                    )}
                    <span className="text-xs text-gray-400 bg-dark-700 px-2 py-1 rounded">
                      {thread.category.name}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                    {thread.title}
                  </h3>
                  <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <Image
                            src={thread.author.avatar_url || `${DEFAULT_AVATAR_URL}${encodeURIComponent(thread.author.username)}`}
                            alt={thread.author.username}
                            width={24}
                            height={24}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <span className={`text-sm font-medium ${getRoleColor(thread.author.role)}`}>
                          {thread.author.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <FaComments />
                          {thread.stats.post_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaEye />
                          {thread.view_count}
                        </span>
                        <span>{formatDate(thread.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/forum/thread/${thread.id}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Konuyu Görüntüle"
                  >
                    <FaExternalLinkAlt />
                  </Link>
                  <button
                    onClick={() => handleTogglePin(thread.id, thread.is_pinned)}
                    disabled={processing}
                    className={`transition-colors disabled:opacity-50 ${
                      thread.is_pinned 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-gray-400 hover:text-blue-400'
                    }`}
                    title={thread.is_pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                  >
                    <FaThumbtack />
                  </button>
                  <button
                    onClick={() => handleToggleLock(thread.id, thread.is_locked)}
                    disabled={processing}
                    className={`transition-colors disabled:opacity-50 ${
                      thread.is_locked 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                    title={thread.is_locked ? 'Kilidi Aç' : 'Kilitle'}
                  >
                    {thread.is_locked ? <FaUnlock /> : <FaLock />}
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setSelectedThread(thread);
                        setShowDeleteModal(true);
                      }}
                      disabled={processing}
                      className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Sil"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredThreads.length === 0 && (
          <div className="text-center py-12">
            <FaComments className="mx-auto text-gray-600 text-4xl mb-4" />
            <p className="text-gray-400">Konu bulunamadı</p>
          </div>
        )}
      </div>
      {showDeleteModal && selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Konuyu Sil</h3>
            <p className="text-gray-400 mb-6">
              <span className="font-medium text-white">"{selectedThread.title}"</span> konusunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve konuya ait tüm gönderiler de silinecektir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedThread(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 