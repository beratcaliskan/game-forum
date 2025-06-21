'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { FaEye, FaComment, FaThumbsUp, FaClock, FaUser, FaGamepad, FaPaperPlane } from 'react-icons/fa';
type ReviewThread = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  author: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  categories?: {
    name: string;
  };
  posts_count: number;
  likes_count: number;
};
export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('threads')
        .select(`
          id,
          title,
          content,
          created_at,
          view_count,
          profiles!threads_author_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          categories (
            id,
            name
          )
        `)
        .eq('categories.name', 'Incelemeler')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const reviewsWithStats = await Promise.all(
        (data || []).map(async (thread) => {
          const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          const { count: likesCount } = await supabase
            .from('thread_likes')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          return {
            id: thread.id,
            title: thread.title,
            content: thread.content,
            created_at: thread.created_at,
            view_count: thread.view_count,
            author: Array.isArray(thread.profiles) ? thread.profiles[0] : thread.profiles,
            categories: Array.isArray(thread.categories) ? thread.categories[0] : thread.categories,
            posts_count: postsCount || 0,
            likes_count: likesCount || 0,
          };
        })
      );
      setReviews(reviewsWithStats);
    } catch (error: any) {
      console.error('İncelemeler alınırken hata:', error);
      setError('İncelemeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchReviews();
  }, []);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${diffInHours} saat önce`;
    } else if (diffInDays < 30) {
      return `${diffInDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  return (
    <div className="bg-dark-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
            <div className="text-3xl sm:text-4xl text-primary-500">
              <FaGamepad />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Oyun İncelemeleri</h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-6 px-4">
            Oyun tutkunlarının en güncel oyun incelemelerini keşfedin. 
            Detaylı analizler, puanlamalar ve oyuncular gözünden değerlendirmeler.
          </p>
          {user ? (
            <Link 
              href="/forum/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:scale-105 text-sm sm:text-base"
            >
              <FaPaperPlane className="text-sm" />
              <span className="font-medium">İnceleme Yaz</span>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="text-gray-400 text-sm sm:text-base">İnceleme yazmak için</span>
              <Link 
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 text-sm sm:text-base"
              >
                <FaUser className="text-sm" />
                <span>Giriş Yap</span>
              </Link>
            </div>
          )}
        </div>
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-8 text-center">
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {reviews.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl text-gray-600 mb-4">
                  <FaGamepad />
                </div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  Henüz inceleme bulunmuyor
                </h3>
                <p className="text-gray-500">
                  İlk incelemeyi yazmak için forum kısmına gidin.
                </p>
                <Link 
                  href="/forum"
                  className="inline-block mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Forumda İnceleme Yaz
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-gray-300 text-center">
                    <span className="font-semibold text-primary-400">{reviews.length}</span> inceleme bulundu
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-max">
                  {reviews.map((review, index) => {
                    const getCardSize = (index: number) => {
                      const patterns = [
                        'col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2',
                        'col-span-1 sm:col-span-1 lg:col-span-1 lg:row-span-1',
                        'col-span-1 sm:col-span-1 lg:col-span-1 lg:row-span-1',
                        'col-span-1 sm:col-span-1 lg:col-span-1 lg:row-span-2',
                        'col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-1',
                        'col-span-1 sm:col-span-1 lg:col-span-1 lg:row-span-1',
                      ];
                      return patterns[index % patterns.length];
                    };
                    const cardSize = getCardSize(index);
                    const isLarge = cardSize.includes('col-span-2') && cardSize.includes('row-span-2');
                    const isTall = cardSize.includes('row-span-2') && !cardSize.includes('col-span-2');
                    const isWide = cardSize.includes('col-span-2') && !cardSize.includes('row-span-2');
                    return (
                    <div
                      key={review.id}
                      className={`bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10 group ${cardSize}`}
                    >
                        <div className={`${isLarge ? 'p-8 pb-6' : 'p-6 pb-4'}`}>
                          <Link href={`/forum/thread/${review.id}`}>
                            <h3 className={`font-bold text-white mb-3 group-hover:text-primary-400 transition-colors ${isLarge ? 'text-2xl line-clamp-3' : 'text-xl line-clamp-2'}`}>
                              {review.title}
                            </h3>
                          </Link>
                          {review.categories && (
                            <div className="mb-3">
                              <span className={`inline-block bg-primary-500/20 text-primary-400 font-medium px-2 py-1 rounded-full ${isLarge ? 'text-sm' : 'text-xs'}`}>
                                {review.categories.name}
                              </span>
                            </div>
                          )}
                          <p className={`text-gray-400 leading-relaxed mb-4 ${isLarge ? 'text-base line-clamp-6' : isTall ? 'text-sm line-clamp-5' : 'text-sm line-clamp-3'}`}>
                            {truncateContent(review.content, isLarge ? 300 : isTall ? 200 : 150)}
                          </p>
                        </div>
                        <div className={`${isLarge ? 'px-8 pb-6' : 'px-6 pb-4'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`${isLarge ? 'w-12 h-12' : 'w-8 h-8'} rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden`}>
                              {review.author.avatar_url ? (
                                <img 
                                  src={review.author.avatar_url} 
                                  alt={review.author.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FaUser className={`text-primary-400 ${isLarge ? 'text-lg' : 'text-sm'}`} />
                              )}
                            </div>
                            <div>
                              <div className={`text-white font-medium ${isLarge ? 'text-base' : 'text-sm'}`}>
                                {review.author.display_name || review.author.username}
                              </div>
                              <div className={`text-gray-500 flex items-center gap-1 ${isLarge ? 'text-sm' : 'text-xs'}`}>
                                <FaClock />
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`${isLarge ? 'px-8 pb-8' : 'px-6 pb-6'}`}>
                          <div className={`flex items-center justify-between ${isLarge ? 'text-base' : 'text-sm'}`}>
                            <div className={`flex items-center ${isLarge ? 'gap-6' : 'gap-4'}`}>
                              <div className="flex items-center gap-1 text-gray-400">
                                <FaEye className={isLarge ? 'text-base' : 'text-sm'} />
                                <span>{review.view_count}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <FaComment className={isLarge ? 'text-base' : 'text-sm'} />
                                <span>{review.posts_count}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <FaThumbsUp className={isLarge ? 'text-base' : 'text-sm'} />
                                <span>{review.likes_count}</span>
                              </div>
                            </div>
                            <Link 
                              href={`/forum/thread/${review.id}`}
                              className={`text-primary-400 hover:text-primary-300 font-medium transition-colors ${isLarge ? 'text-base' : 'text-sm'}`}
                            >
                              Oku →
                            </Link>
                          </div>
                        </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 