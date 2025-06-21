'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaFilter, FaUser, FaEye, FaComment, FaClock, FaHeart, FaFlag, FaPaperPlane } from 'react-icons/fa';
import { supabase, likeThread, unlikeThread, getThreadLikeCount, checkUserThreadLike } from '../../lib/supabase';
import { MarkdownText } from '../../lib/markdown';
import { useAuth } from '../../lib/AuthContext';
import ReportModal from '../../components/ReportModal';
type Category = {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
};
type Thread = {
  id: number;
  title: string;
  content: string;
  author_id: number;
  category_id: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
    role: string;
  };
  categories?: {
    name: string;
  };
  posts?: {
    count: number;
  }[];
  isLiked?: boolean;
  likeCount?: number;
};

function ForumContent() {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'author' | 'content'>('title');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular' | 'most_replies'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetTitle, setReportTargetTitle] = useState<string>('');
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
        .select('id, name, description')
          .order('name');
        if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Kategoriler alınırken hata:', error);
    }
  };
  const fetchThreads = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('threads')
        .select(`
          *,
          profiles:author_id (
            username,
            display_name,
            avatar_url
          ),
          categories:category_id (
            name
          )
        `);
      if (selectedCategory) {
        console.log('Filtering by category ID:', selectedCategory);
        query = query.eq('category_id', selectedCategory);
      }
      if (searchTerm) {
        if (searchType === 'title') {
          query = query.ilike('title', `%${searchTerm}%`);
        } else if (searchType === 'content') {
          query = query.ilike('content', `%${searchTerm}%`);
        }
      }
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
      }
      query = query.order('is_pinned', { ascending: false });
      const { data: threadsData, error } = await query.limit(50);
      if (error) throw error;
      let filteredThreads = threadsData || [];
      if (searchTerm && searchType === 'author') {
        filteredThreads = filteredThreads.filter(thread => 
          thread.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          thread.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      const threadsWithCounts = await Promise.all(
        filteredThreads.map(async (thread) => {
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          const { count: threadLikeCount } = await getThreadLikeCount(thread.id);
          let isLiked = false;
          if (user) {
            const { isLiked: userLiked } = await checkUserThreadLike(thread.id, user.id);
            isLiked = userLiked;
          }
          return {
            ...thread,
            posts: [{ count: postCount || 0 }],
            likeCount: threadLikeCount || 0,
            isLiked
          };
        })
      );
      setThreads(threadsWithCounts);
      } catch (error: any) {
        setError(error.message);
      console.error('Konular alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
    fetchCategories();
  }, []);
  useEffect(() => {
    const categoryParam = searchParams.get('selectedCategory');
    const searchParam = searchParams.get('search');
    if (categoryParam && categories.length > 0) {
      const categoryId = parseInt(categoryParam);
      if (!isNaN(categoryId)) {
        const categoryExists = categories.some(cat => cat.id === categoryId);
        if (categoryExists) {
          setSelectedCategory(categoryId);
        }
      }
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParams, categories]);
  useEffect(() => {
    fetchThreads();
  }, [searchTerm, searchType, selectedCategory, sortBy, user]);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchThreads();
  };
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSortBy('newest');
    setSearchType('title');
    window.history.replaceState({}, '', '/forum');
  };
  const handleThreadLike = async (threadId: number, isCurrentlyLiked: boolean) => {
    if (!user) {
      alert('Beğenmek için giriş yapmalısınız');
      return;
    }
    try {
      if (isCurrentlyLiked) {
        await unlikeThread(threadId, user.id);
      } else {
        await likeThread(threadId, user.id);
      }
      setThreads(threads => 
        threads.map(thread => 
          thread.id === threadId 
            ? {
                ...thread,
                isLiked: !isCurrentlyLiked,
                likeCount: (thread.likeCount || 0) + (isCurrentlyLiked ? -1 : 1)
              }
            : thread
        )
      );
    } catch (error) {
      console.error('Thread beğeni işlemi sırasında hata:', error);
      alert('Bir hata oluştu, lütfen tekrar deneyin');
    }
  };
  const handleThreadReport = (threadId: number, threadTitle: string) => {
    setReportTargetId(threadId);
    setReportTargetTitle(threadTitle);
    setReportModalOpen(true);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Forum</h1>
            <p className="text-gray-300 text-sm sm:text-base">
              Oyun topluluğumuzun en son konularını keşfedin ve tartışmalara katılın
        </p>
      </div>
          {user ? (
            <Link 
              href="/forum/new"
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:scale-105 text-sm sm:text-base"
            >
              <FaPaperPlane className="text-sm" />
              <span className="font-medium">Konu Aç</span>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">Konu açmak için</span>
              <Link 
                href="/auth/login"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 text-sm"
              >
                <FaUser className="text-sm" />
                <span>Giriş Yap</span>
              </Link>
            </div>
          )}
        </div>
      </div>
        <div className="bg-dark-700 rounded-xl p-6 mb-8 border border-dark-600">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Arama
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ara..."
                    className="w-full pl-10 pr-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="w-full md:min-w-[140px] md:w-auto">
                <label className="block text-sm font-medium text-gray-300 mb-2 md:mb-2">
                  Arama Türü
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'title' | 'author' | 'content')}
                  className="w-full py-3 px-4 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="title">Başlık</option>
                  <option value="author">Yazar</option>
                  <option value="content">İçerik</option>
                </select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaSearch />
                  <span className="hidden sm:inline">Ara</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 md:flex-none px-4 py-3 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaFilter />
                  <span className="hidden sm:inline">Filtrele</span>
                </button>
              </div>
            </div>
          </form>
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-dark-600">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kategori
                </label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                  className="w-full py-2 px-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sıralama
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2 px-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="popular">En Popüler</option>
                </select>
              </div>
              <div className="flex sm:items-end">
                <button
                  onClick={clearFilters}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Temizle
                </button>
              </div>
            </div>
          )}
        </div>
      {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-300">
                {threads.length} konu bulundu
                {searchTerm && (
                  <span className="text-primary-400"> "{searchTerm}" arama sonucu</span>
                )}
                {selectedCategory && (
                  <span className="text-primary-400"> 
                    {' '}{categories.find(c => c.id === selectedCategory)?.name} kategorisinde
                  </span>
                )}
                {selectedCategory && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      window.history.replaceState({}, '', '/forum');
                    }}
                    className="ml-2 text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded hover:bg-primary-500/30 transition-colors"
                  >
                    ✕ Filtreyi Kaldır
                  </button>
                )}
              </p>
            </div>
            <div className="space-y-4">
              {threads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Hiç konu bulunamadı</p>
                  <p className="text-gray-500 mt-2">Arama kriterlerinizi değiştirmeyi deneyin</p>
        </div>
      ) : (
                threads.map((thread) => (
            <div 
                    key={thread.id}
                    className={`bg-dark-700 rounded-xl p-6 border transition-all hover:border-primary-500/50 ${
                      thread.is_pinned ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-dark-600'
                    } ${thread.is_locked ? 'opacity-75' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 order-2 sm:order-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {thread.is_pinned && (
                            <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-medium">
                              SABİTLENMİŞ
                            </span>
                          )}
                          {thread.is_locked && (
                            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                              KİLİTLİ
                            </span>
                          )}
                  <Link 
                            href={`/forum/thread/${thread.id}`}
                            className="text-lg sm:text-xl font-semibold text-white hover:text-primary-400 transition-colors break-words"
                  >
                            {thread.title}
                  </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-3">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <FaUser className="text-xs" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{thread.profiles?.display_name || thread.profiles?.username}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <FaClock className="text-xs" />
                            <span className="whitespace-nowrap">
                              {formatDate(thread.created_at)}
                  </span>
                </div>
                          {thread.categories && (
                            <span className="bg-primary-500/20 text-primary-300 px-2 py-1 rounded text-xs whitespace-nowrap">
                              {thread.categories.name}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-300 mb-3 line-clamp-2 text-sm sm:text-base">
                          <MarkdownText className="">
                            {thread.content.substring(0, 150) + '...'}
                          </MarkdownText>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <FaEye />
                              <span className="whitespace-nowrap">{thread.view_count} görüntüleme</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <FaComment />
                              <span className="whitespace-nowrap">{thread.posts?.[0]?.count || 0} yanıt</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <FaHeart />
                              <span className="whitespace-nowrap">{thread.likeCount || 0} beğeni</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleThreadReport(thread.id, thread.title)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors"
                              title="Şikayet Et"
                            >
                              <FaFlag className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 order-1 sm:order-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary-500/20">
                          {thread.profiles?.avatar_url ? (
                            <Image
                              src={thread.profiles.avatar_url}
                              alt={thread.profiles.username || ''}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary-400">
                              <FaUser />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
              </div>
                ))
              )}
            </div>
            {threads.length >= 50 && (
              <div className="text-center mt-8">
                <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                  Daha Fazla Yükle
                </button>
        </div>
      )}
          </>
        )}
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportType="thread"
          targetId={reportTargetId || undefined}
          targetTitle={reportTargetTitle}
        />
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="bg-dark-900 min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
}

// Main exported component with Suspense wrapper
export default function ForumPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ForumContent />
    </Suspense>
  );
} 