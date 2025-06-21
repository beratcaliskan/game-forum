'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaGamepad, FaTrophy, FaNewspaper, FaQuestionCircle, FaLightbulb, FaUsers, FaComment, FaEye, FaClock, FaHeart, FaFlag, FaPaperPlane, FaUser, FaStar, FaCog } from 'react-icons/fa';
import { supabase, likeThread, unlikeThread, getThreadLikeCount, checkUserThreadLike } from '../lib/supabase';
import { MarkdownText } from '../lib/markdown';
import { useAuth } from '../lib/AuthContext';
import ReportModal from '../components/ReportModal';

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
  };
  categories?: {
    name: string;
  };
  posts?: {
    count: number;
  }[];
  likes?: {
    count: number;
  }[];
  isLiked?: boolean;
  likeCount?: number;
};
export default function Home() {
  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [recentReviews, setRecentReviews] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetTitle, setReportTargetTitle] = useState<string>('');
  const fetchRecentThreads = async () => {
    try {
      const { data: threadsData, error } = await supabase
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
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const threadsWithCounts = await Promise.all(
        (threadsData || []).map(async (thread) => {
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          const { count: likeCount } = await getThreadLikeCount(thread.id);
          let isLiked = false;
          if (user) {
            const { isLiked: userLiked } = await checkUserThreadLike(thread.id, user.id);
            isLiked = userLiked;
          }
          return {
            ...thread,
            posts: [{ count: postCount || 0 }],
            likeCount: likeCount || 0,
            isLiked
          };
        })
      );
      setRecentThreads(threadsWithCounts);
    } catch (error: any) {
      console.error('Son konular alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchRecentReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
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
        `)
        .eq('categories.name', 'Incelemeler')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      const reviewsWithCounts = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', review.id);
          return {
            ...review,
            posts: [{ count: postCount || 0 }]
          };
        })
      );
      setRecentReviews(reviewsWithCounts);
    } catch (error: any) {
      console.error('Son incelemeler alınırken hata:', error);
    }
  };
  useEffect(() => {
    fetchRecentThreads();
    fetchRecentReviews();
  }, [user]);
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
      setRecentThreads(threads => 
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
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
      <section className="relative py-20 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-12 lg:mb-0 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-500 mb-6">
                Oyun Tutkunları İçin Modern Forum
              </h1>
              <p className="text-base sm:text-lg text-gray-300 mb-8 px-4 lg:px-0">
                Oyun dünyasındaki en güncel tartışmalara katılın, yeni arkadaşlar edinin
                ve oyun deneyimlerinizi paylaşın.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
                {user ? (
                  <>
                    <Link 
                      href="/forum/new" 
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/25 text-sm sm:text-base"
                    >
                      <FaPaperPlane />
                      <span>Konu Aç</span>
                    </Link>
                    <Link 
                      href="/forum" 
                      className="inline-flex items-center justify-center bg-dark-800 hover:bg-dark-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg border border-primary-500 transition duration-300 text-sm sm:text-base"
                    >
                      Foruma Göz At
                    </Link>
                  </>
                ) : (
                  <>
                <Link 
                  href="/auth/register" 
                  className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition duration-300 text-sm sm:text-base"
                >
                  Şimdi Katıl
                </Link>
                <Link 
                  href="/forum" 
                  className="inline-flex items-center justify-center bg-dark-800 hover:bg-dark-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg border border-primary-500 transition duration-300 text-sm sm:text-base"
                >
                  Foruma Göz At
                </Link>
                  </>
                )}
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg h-64 sm:h-72 lg:h-80 rounded-xl overflow-hidden bg-transparent flex items-center justify-center p-2">
                <div className="relative w-full h-full">
                  <Image
                    src="/gaming-icon.png"
                    alt="Gaming Icon"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 md:px-8 bg-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Forum Kategorileri</h2>
            <p className="text-gray-400 text-sm sm:text-base px-4">Oyun dünyasının farklı alanlarında tartışmalara katılın</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-primary-500 text-2xl">
                    <FaGamepad />
                  </div>
                  <h3 className="text-xl font-bold text-white">Forum</h3>
                </div>
                <p className="text-gray-400 mb-4">Oyunlar hakkında genel tartışmalar ve konular</p>
                <div className="flex justify-between items-center">
                  <Link href="/forum" className="text-primary-500 hover:text-primary-400">
                    Göz At →
                  </Link>
                  <span className="text-sm text-gray-500">1243 Konu</span>
                </div>
              </div>
            </div>
            <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-primary-500 text-2xl">
                    <FaStar />
                  </div>
                  <h3 className="text-xl font-bold text-white">İncelemeler</h3>
                </div>
                <p className="text-gray-400 mb-4">Detaylı oyun incelemeleri ve değerlendirmeleri</p>
                <div className="flex justify-between items-center">
                  <Link href="/incelemeler" className="text-primary-500 hover:text-primary-400">
                    Göz At →
                  </Link>
                  <span className="text-sm text-gray-500">89 İnceleme</span>
                </div>
              </div>
            </div>
            <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-primary-500 text-2xl">
                    <FaNewspaper />
                  </div>
                  <h3 className="text-xl font-bold text-white">Oyun Haberleri</h3>
                </div>
                <p className="text-gray-400 mb-4">En son oyun haberleri ve duyurular</p>
                <div className="flex justify-between items-center">
                  <Link href="/haberler" className="text-primary-500 hover:text-primary-400">
                    Göz At →
                  </Link>
                  <span className="text-sm text-gray-500">890 Konu</span>
                </div>
              </div>
            </div>
            <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-primary-500 text-2xl">
                    <FaUser />
                  </div>
                  <h3 className="text-xl font-bold text-white">Profilim</h3>
                </div>
                <p className="text-gray-400 mb-4">Kişisel profil sayfanız ve ayarlarınız</p>
                <div className="flex justify-between items-center">
                  <Link href="/profile" className="text-primary-500 hover:text-primary-400">
                    Göz At →
                  </Link>
                  <span className="text-sm text-gray-500">Kişisel</span>
                </div>
              </div>
            </div>
            <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-primary-500 text-2xl">
                    <FaCog />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ayarlar</h3>
                </div>
                <p className="text-gray-400 mb-4">Hesap ve gizlilik ayarlarınız</p>
                <div className="flex justify-between items-center">
                  <Link href="/settings" className="text-primary-500 hover:text-primary-400">
                    Göz At →
                  </Link>
                  <span className="text-sm text-gray-500">Kişisel</span>
                </div>
              </div>
            </div>
             <div className="bg-dark-900 rounded-xl overflow-hidden transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border border-dark-800 hover:border-primary-500/50">
               <div className="p-6">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="text-primary-500 text-2xl">
                     <FaUsers />
                   </div>
                   <h3 className="text-xl font-bold text-white">Topluluk</h3>
                 </div>
                 <p className="text-gray-400 mb-4">Genel sohbet ve topluluk etkinlikleri</p>
                 <div className="flex justify-between items-center">
                   <Link href="/forum" className="text-primary-500 hover:text-primary-400">
                     Göz At →
                   </Link>
                   <span className="text-sm text-gray-500">432 Konu</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Son Konular</h2>
            <p className="text-gray-400">Topluluğumuzda en son açılan konular</p>
          </div>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-dark-800 rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0"></div>
                <div className="flex-1">
                      <div className="h-6 bg-gray-700 rounded mb-2"></div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                        <div className="h-4 bg-gray-700 rounded w-32"></div>
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                  </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 bg-gray-700 rounded w-16"></div>
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
              ))
            ) : recentThreads.length > 0 ? (
              recentThreads.map((thread) => (
                <div key={thread.id} className="bg-dark-800 rounded-lg p-4 hover:bg-dark-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden">
                      {thread.profiles?.avatar_url ? (
                        <Image
                          src={thread.profiles.avatar_url}
                          alt={thread.profiles.display_name || thread.profiles.username || ''}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary-500/30 flex items-center justify-center text-primary-400">
                          {(thread.profiles?.display_name || thread.profiles?.username || 'A')[0].toUpperCase()}
                        </div>
                      )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white hover:text-primary-500">
                        <Link href={`/forum/thread/${thread.id}`}>
                          {thread.title}
                        </Link>
                  </h3>
                      <div className="flex items-center text-sm text-gray-400 mt-1 flex-wrap gap-x-4 gap-y-1">
                        <span>Yazar: {thread.profiles?.display_name || thread.profiles?.username}</span>
                        <span>Kategori: {thread.categories?.name}</span>
                        <span className="flex items-center gap-1">
                          <FaClock className="text-xs" />
                          {formatDate(thread.created_at)}
                        </span>
                  </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-sm gap-4">
                          {thread.is_pinned && (
                            <span className="bg-primary-500 text-white px-2 py-1 rounded text-xs">Sabitlenmiş</span>
                          )}
                          <span className="text-gray-400 flex items-center gap-1">
                            <FaComment className="text-xs" />
                            {thread.posts?.[0]?.count || 0} Yanıt
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <FaEye className="text-xs" />
                            {thread.view_count} Görüntülenme
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleThreadReport(thread.id, thread.title)}
                              className="flex items-center gap-1 text-sm text-gray-400 hover:text-yellow-500 transition-colors"
                              title="Şikayet Et"
                            >
                              <FaFlag className="text-xs" />
                            </button>
                  </div>
                </div>
              </div>
                      <div className="mt-2 text-sm text-gray-400 line-clamp-2">
                        <MarkdownText>{thread.content}</MarkdownText>
                </div>
                  </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Henüz konu bulunmuyor.</p>
              </div>
            )}
          </div>
          <div className="mt-8 text-center">
            <Link 
              href="/forum" 
              className="inline-block text-primary-500 hover:text-primary-400 font-semibold"
            >
              Tüm konuları görüntüle →
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 md:px-8 bg-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Son İncelemeler</h2>
            <p className="text-gray-400">Topluluktan en yeni oyun değerlendirmeleri</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="bg-dark-900 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary-500/20 transition-all border border-dark-700 hover:border-primary-500/50">
                  <div className="p-6">
                    <h3 className="font-bold text-white text-lg mb-2 hover:text-primary-400">
                      <Link href={`/forum/thread/${review.id}`}>
                        {review.title}
                      </Link>
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      <MarkdownText>{review.content}</MarkdownText>
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden">
                          {review.profiles?.avatar_url ? (
                            <Image
                              src={review.profiles.avatar_url}
                              alt={review.profiles.display_name || review.profiles.username || ''}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary-500/30 flex items-center justify-center text-primary-400 text-xs">
                              {(review.profiles?.display_name || review.profiles?.username || 'A')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">
                          {review.profiles?.display_name || review.profiles?.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <FaComment />
                          {review.posts?.[0]?.count || 0}
                        </span>
                        <Link href={`/forum/thread/${review.id}`} className="text-primary-500 hover:text-primary-400 text-sm">
                          Oku →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400">Henüz inceleme bulunmuyor.</p>
              </div>
            )}
          </div>
          <div className="mt-8 text-center">
            <Link 
              href="/incelemeler" 
              className="inline-block text-primary-500 hover:text-primary-400 font-semibold"
            >
              Tüm incelemeleri görüntüle →
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 md:px-8 bg-gradient-to-r from-primary-700 to-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Oyun tutkunlarının topluluğuna katıl!</h2>
          <p className="text-white/90 text-lg mb-8">
            Binlerce oyun tutkunuyla tartışın, bilgi paylaşın ve oyun deneyimlerinizi zenginleştirin.
          </p>
          <Link 
            href="/auth/register" 
            className="inline-block bg-white text-primary-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition duration-300"
          >
            Hemen Üye Ol
          </Link>
        </div>
      </section>
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType="thread"
        targetId={reportTargetId || undefined}
        targetTitle={reportTargetTitle}
      />
    </div>
  );
} 