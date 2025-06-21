'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaArrowLeft,
  FaUser,
  FaEye,
  FaComment,
  FaHeart,
  FaClock,
  FaShare,
  FaBookmark,
  FaFlag,
  FaPaperPlane,
  FaThumbsUp,
  FaReply,
  FaQuoteLeft
} from 'react-icons/fa';
import { supabase, validateToken, likeThread, unlikeThread, getThreadLikeCount, checkUserThreadLike } from '../../../../lib/supabase';
import ReportModal from '../../../../components/ReportModal';
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
    id: number;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
    role: string;
  };
  categories?: {
    name: string;
  };
  likeCount?: number;
  isLiked?: boolean;
};
type Post = {
  id: number;
  content: string;
  author_id: number;
  thread_id: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string;
    role: string;
  };
  likes?: { count: number }[];
  userLiked?: boolean;
};
type RelatedThread = {
  id: number;
  title: string;
  created_at: string;
  view_count: number;
  profiles?: {
    username: string;
    display_name: string;
  }[];
};
export default function ThreadDetail() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.id as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [relatedThreads, setRelatedThreads] = useState<RelatedThread[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'thread' | 'post'>('post');
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetTitle, setReportTargetTitle] = useState<string>('');
  const [copiedPostId, setCopiedPostId] = useState<number | null>(null);
  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const { user, error } = await validateToken(token);
      if (error || !user) {
        console.error('Token doğrulama hatası:', error);
        localStorage.removeItem('auth_token');
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!profileError && profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Kullanıcı profili alınırken hata:', error);
      localStorage.removeItem('auth_token');
    }
  };
  const fetchThread = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          profiles:author_id (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            role
          ),
          categories:category_id (
            name
          )
        `)
        .eq('id', threadId)
        .single();
      if (error) throw error;
      const { count: threadLikeCount } = await getThreadLikeCount(data.id);
      let isLiked = false;
      if (userProfile) {
        const { isLiked: userLiked } = await checkUserThreadLike(data.id, userProfile.user_id);
        isLiked = userLiked;
      }
      setThread({
        ...data,
        likeCount: threadLikeCount || 0,
        isLiked
      });
      await supabase
        .from('threads')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', threadId);
    } catch (error: any) {
      setError(error.message);
      console.error('Konu alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchPosts = async () => {
    try {
      setPostsLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const postsWithLikes = await Promise.all(
        (data || []).map(async (post) => {
          const { count: likeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          let userLiked = false;
          if (userProfile) {
            const { data: userLikeData } = await supabase
              .from('likes')
              .select('*')
              .eq('post_id', post.id)
              .eq('user_id', userProfile.id)
              .single();
            userLiked = !!userLikeData;
          }
          return {
            ...post,
            likes: [{ count: likeCount || 0 }],
            userLiked
          };
        })
      );
      setPosts(postsWithLikes);
    } catch (error: any) {
      console.error('Yorumlar alınırken hata:', error);
    } finally {
      setPostsLoading(false);
    }
  };
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !userProfile) return;
    try {
      setSubmitLoading(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            content: newPostContent,
            author_id: userProfile.id,
            thread_id: parseInt(threadId)
          }
        ])
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      setNewPostContent('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2000);
      await fetchPosts();
    } catch (error: any) {
      console.error('Yorum gönderilirken hata:', error);
      setSubmitError(error.message || 'Yorum gönderilirken bir hata oluştu');
    } finally {
      setSubmitLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const handleQuoteThread = () => {
    if (!thread) return;
    const quoteText = `> **${thread.profiles?.display_name || thread.profiles?.username}** yazdı:\n> ${thread.content.split('\n').join('\n> ')}\n\n`;
    setNewPostContent(prevContent => 
      prevContent ? prevContent + '\n' + quoteText : quoteText
    );
    setTimeout(() => {
      const replyForm = document.getElementById('reply-form');
      if (replyForm) {
        replyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }
    }, 100);
  };
  const handleQuotePost = (post: Post, postIndex: number) => {
    const quoteText = `> #${postIndex + 1} - ${post.profiles?.display_name || post.profiles?.username}:\n> ${post.content.split('\n').join('\n> ')}\n\n`;
    setNewPostContent(prevContent => 
      prevContent ? prevContent + '\n' + quoteText : quoteText
    );
    setTimeout(() => {
      const replyForm = document.getElementById('reply-form');
      if (replyForm) {
        replyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }
    }, 100);
  };
  const formatTextWithMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentQuoteGroup: string[] = [];
    let elementIndex = 0;
    const flushQuoteGroup = () => {
      if (currentQuoteGroup.length > 0) {
        elements.push(
          <div key={`quote-${elementIndex++}`} className="border-l-4 border-primary-500 bg-primary-500/10 pl-4 py-2 mb-2 rounded-r">
            {currentQuoteGroup.map((quoteLine, idx) => (
              <div key={idx} className="text-gray-300 italic text-sm mb-1 last:mb-0">
                <span className="inline-block" dangerouslySetInnerHTML={{ __html: processInlineFormatting(quoteLine) }} />
              </div>
            ))}
          </div>
        );
        currentQuoteGroup = [];
      }
    };
    const processInlineFormatting = (line: string) => {
      return line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic text-gray-200">$1</em>')
        .replace(/`([^`]+?)`/g, '<code class="bg-dark-600 text-primary-300 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-400">$1</del>')
        .replace(/__(.*?)__/g, '<u class="underline text-gray-200">$1</u>');
    };
    lines.forEach((line, lineIndex) => {
      if (line.startsWith('> ')) {
        currentQuoteGroup.push(line.substring(2));
      } else {
        flushQuoteGroup();
        const processedLine = processInlineFormatting(line);
        if (line.trim()) {
          elements.push(
            <div 
              key={`line-${elementIndex++}`} 
              className="mb-1 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: processedLine }}
            />
          );
        } else {
          elements.push(<div key={`space-${elementIndex++}`} className="h-3"></div>);
        }
      }
    });
    flushQuoteGroup();
    return elements;
  };
  const fetchRelatedThreads = async () => {
    if (!thread?.category_id) return;
    try {
      const { data, error } = await supabase
        .from('threads')
        .select(`
          id,
          title,
          created_at,
          view_count,
          profiles:author_id (
            username,
            display_name
          )
        `)
        .eq('category_id', thread.category_id)
        .neq('id', thread.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setRelatedThreads(data || []);
    } catch (error: any) {
      console.error('İlgili konular alınırken hata:', error);
    }
  };
  const handleLikePost = async (postId: number) => {
    if (!userProfile) return;
    try {
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('post_id', postId)
        .single();
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      if (existingLike) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userProfile.id)
          .eq('post_id', postId);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('likes')
          .insert([
            {
              user_id: userProfile.id,
              post_id: postId
            }
          ]);
        if (insertError) throw insertError;
      }
      await fetchPosts();
    } catch (error: any) {
      console.error('Beğeni işlemi sırasında hata:', error);
    }
  };
  const handleThreadReport = () => {
    if (!thread) return;
    setReportType('thread');
    setReportTargetId(thread.id);
    setReportTargetTitle(thread.title);
    setReportModalOpen(true);
  };
  const handlePostReport = (postId: number, postContent: string) => {
    setReportType('post');
    setReportTargetId(postId);
    setReportTargetTitle(postContent.substring(0, 100) + '...');
    setReportModalOpen(true);
  };
  const handleThreadLike = async () => {
    if (!userProfile || !thread) {
      alert('Beğenmek için giriş yapmalısınız');
      return;
    }
    try {
      if (thread.isLiked) {
        await unlikeThread(thread.id, userProfile.user_id);
      } else {
        await likeThread(thread.id, userProfile.user_id);
      }
      setThread(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: (prev.likeCount || 0) + (prev.isLiked ? -1 : 1)
      } : null);
    } catch (error) {
      console.error('Thread beğeni işlemi sırasında hata:', error);
      alert('Bir hata oluştu, lütfen tekrar deneyin');
    }
  };
  useEffect(() => {
    if (threadId) {
      getCurrentUser();
    }
  }, [threadId]);
  useEffect(() => {
    if (threadId) {
      fetchThread();
      fetchPosts();
    }
  }, [threadId, userProfile]);
  useEffect(() => {
    if (thread) {
      fetchRelatedThreads();
    }
  }, [thread]);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && posts.length > 0) {
      const hash = window.location.hash;
      const positionMatch = hash.match(/#(\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const timer = setTimeout(() => {
          const commentElement = document.getElementById(`comment-${position}`);
          if (commentElement) {
            commentElement.scrollIntoView({ 
              behavior: 'smooth',
              block: 'center'
            });
            commentElement.classList.add('ring-2', 'ring-primary-500', 'ring-opacity-50');
            setTimeout(() => {
              commentElement.classList.remove('ring-2', 'ring-primary-500', 'ring-opacity-50');
            }, 3000);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [posts]);
  if (loading) {
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
  if (error || !thread) {
    return (
      <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-400 text-lg mb-4">{error || 'Konu bulunamadı'}</p>
            <Link
              href="/forum"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FaArrowLeft />
              Forum'a Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-b from-dark-900 to-dark-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/forum"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-4"
          >
            <FaArrowLeft />
            Forum'a Dön
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/forum" className="hover:text-white">Forum</Link>
            <span>/</span>
            {thread.categories && (
              <>
                <span className="text-primary-400">{thread.categories.name}</span>
                <span>/</span>
              </>
            )}
            <span className="text-white truncate">{thread.title}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-dark-700 rounded-xl p-6 border border-dark-600 mb-6">
              <div className="flex items-center gap-2 mb-4">
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
                <h1 className="text-2xl font-bold text-white">{thread.title}</h1>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-xs" />
                    <span>{thread.profiles?.display_name || thread.profiles?.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock className="text-xs" />
                    <span>{formatDate(thread.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEye className="text-xs" />
                    <span>{thread.view_count} görüntüleme</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleThreadLike}
                    className={`px-3 py-2 transition-colors flex items-center gap-2 text-sm ${
                      thread.isLiked
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <FaHeart className={thread.isLiked ? 'text-red-400' : ''} />
                    <span>{thread.likeCount || 0}</span>
                  </button>
                  <button 
                    onClick={handleQuoteThread}
                    className="px-3 py-2 text-gray-400 hover:text-primary-400 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FaQuoteLeft />
                    <span>Alıntıla</span>
                  </button>
                  <button 
                    onClick={handleThreadReport}
                    className="px-3 py-2 text-gray-400 hover:text-yellow-400 transition-colors flex items-center gap-2 text-sm"
                    title="Şikayet Et"
                  >
                    <FaFlag />
                    <span>Şikayet Et</span>
                  </button>
                </div>
              </div>
              <div className="prose prose-invert max-w-none">
                <div className="text-gray-200 whitespace-pre-wrap">
                  {formatTextWithMarkdown(thread.content)}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  Yorumlar ({posts.length})
                </h2>
              </div>
              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post, index) => (
                    <div
                      key={post.id}
                      id={`comment-${index + 1}`}
                      className="bg-dark-700 rounded-xl p-6 border border-dark-600 transition-all duration-300"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {post.profiles?.username ? (
                            <Link 
                              href={`/profile/${post.profiles.username}`}
                              className="block w-12 h-12 rounded-full overflow-hidden bg-primary-500/20 hover:ring-2 hover:ring-primary-400 transition-all duration-200 cursor-pointer"
                            >
                              {post.profiles.avatar_url ? (
                                <Image
                                  src={post.profiles.avatar_url}
                                  alt={post.profiles.username}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary-400 hover:text-primary-300 transition-colors">
                                  <FaUser />
                                </div>
                              )}
                            </Link>
                          ) : (
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600/20">
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <FaUser />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {post.profiles?.username ? (
                                <Link 
                                  href={`/profile/${post.profiles.username}`}
                                  className="font-medium text-white hover:text-primary-400 transition-colors cursor-pointer"
                                >
                                  {post.profiles.display_name || post.profiles.username}
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-500">
                                  Bilinmeyen Kullanıcı
                                </span>
                              )}
                              {post.profiles?.role === 'admin' && (
                                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                                  Admin
                                </span>
                              )}
                              {post.profiles?.role === 'moderator' && (
                                <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                                  Moderatör
                                </span>
                              )}
                              <span className="text-sm text-gray-400">
                                #{index + 1}
                              </span>
                            </div>
                            <span className="text-sm text-gray-400">
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                          <div className="text-gray-200 mb-4 whitespace-pre-wrap">
                            {formatTextWithMarkdown(post.content)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <button 
                              onClick={() => handleLikePost(post.id)}
                              disabled={!userProfile}
                              className={`flex items-center gap-2 transition-colors ${
                                post.userLiked 
                                  ? 'text-red-400 hover:text-red-300' 
                                  : 'hover:text-primary-400'
                              } ${!userProfile ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            >
                              <FaThumbsUp className={post.userLiked ? 'text-red-400' : ''} />
                              <span>{post.likes?.[0]?.count || 0}</span>
                            </button>
                            <button 
                              onClick={() => handleQuotePost(post, index)}
                              disabled={!userProfile}
                              className="flex items-center gap-2 hover:text-primary-400 transition-colors"
                            >
                              <FaQuoteLeft />
                              <span>Alıntıla</span>
                            </button>
                            <button 
                              onClick={() => {
                                const url = `${window.location.origin}/forum/thread/${threadId}#${index + 1}`;
                                navigator.clipboard.writeText(url);
                                setCopiedPostId(post.id);
                                setTimeout(() => {
                                  setCopiedPostId(null);
                                }, 2000);
                              }}
                              className={`flex items-center gap-2 transition-colors ${
                                copiedPostId === post.id 
                                  ? 'text-green-400' 
                                  : 'hover:text-primary-400'
                              }`}
                              title="Yorumun linkini kopyala"
                            >
                              <FaShare />
                              <span>
                                {copiedPostId === post.id ? 'Kopyalandı!' : null}
                              </span>
                            </button>
                            <button 
                              onClick={() => handlePostReport(post.id, post.content)}
                              className="flex items-center gap-2 hover:text-yellow-400 transition-colors"
                              title="Şikayet Et"
                            >
                              <FaFlag />
                              <span>Şikayet</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {userProfile && !thread.is_locked && (
                <div id="reply-form" className="bg-dark-700 rounded-xl p-6 border border-dark-600">
                  <h3 className="text-lg font-medium text-white mb-4">Yanıt Yaz</h3>
                  {submitError && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-4">
                      ✅ Yorumunuz başarıyla gönderildi!
                    </div>
                  )}
                  <form onSubmit={handleSubmitPost}>
                    <div className="relative">
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Yanıtınızı yazın..."
                        rows={newPostContent.includes('>') ? 6 : 4}
                        maxLength={1000}
                        disabled={submitLoading}
                        className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                      />
                      {newPostContent.includes('>') && (
                        <div className="absolute top-2 right-2 bg-primary-500/20 text-primary-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                          <FaQuoteLeft className="text-xs" />
                          {newPostContent.split('\n').filter(line => line.startsWith('>')).length} alıntı
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-gray-400">
                        {newPostContent.length} / 1000 karakter
                      </span>
                      <button
                        type="submit"
                        disabled={!newPostContent.trim() || submitLoading}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {submitLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Gönderiliyor...
                          </>
                        ) : (
                          <>
                            <FaPaperPlane />
                            Yanıtla
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {!userProfile && (
                <div className="bg-dark-700 rounded-xl p-6 border border-dark-600 text-center">
                  <p className="text-gray-300 mb-4">Yanıt yazmak için giriş yapın</p>
                  <Link
                    href="/auth/login"
                    className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    Giriş Yap
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {thread.profiles && (
                <div className="bg-dark-700 rounded-xl p-6 border border-dark-600">
                  <h3 className="text-lg font-medium text-white mb-4">Konu Sahibi</h3>
                  <div className="text-center">
                    <Link 
                      href={`/profile/${thread.profiles.username}`}
                      className="hover:no-underline block w-16 h-16 rounded-full overflow-hidden bg-primary-500/20 mx-auto mb-3 hover:ring-2 hover:ring-primary-400 transition-all duration-200 cursor-pointer"
                    >
                      {thread.profiles.avatar_url ? (
                        <Image
                          src={thread.profiles.avatar_url}
                          alt={thread.profiles.username}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary-400 hover:text-primary-300 transition-colors">
                          <FaUser size={24} />
                        </div>
                      )}
                    </Link>
                    <Link 
                      href={`/profile/${thread.profiles.username}`}
                      className="hover:no-underline font-medium text-white hover:text-primary-400 transition-colors cursor-pointer block mb-1"
                    >
                      {thread.profiles.display_name || thread.profiles.username}
                    </Link>
                    <div className="flex justify-center mb-3">
                      {thread.profiles.role === 'admin' && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                          Admin
                        </span>
                      )}
                      {thread.profiles.role === 'moderator' && (
                        <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                          Moderatör
                        </span>
                      )}
                      {thread.profiles.role === 'user' && (
                        <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                          Üye
                        </span>
                      )}
                    </div>
                    {thread.profiles.bio && (
                      <p className="text-sm text-gray-400 mb-4">
                        {thread.profiles.bio}
                      </p>
                    )}
                    <Link
                      href={`/profile/${thread.profiles.username}`}
                      className="hover:no-underline inline-block px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Profili Görüntüle
                    </Link>
                  </div>
                </div>
              )}
              <div className="bg-dark-700 rounded-xl p-6 border border-dark-600">
                <h3 className="text-lg font-medium text-white mb-4">İstatistikler</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Görüntüleme</span>
                    <span className="text-white font-medium">{thread.view_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Yanıt</span>
                    <span className="text-white font-medium">{posts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Oluşturulma</span>
                    <span className="text-white font-medium text-sm">
                      {formatDate(thread.created_at)}
                    </span>
                  </div>
                  {thread.categories && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Kategori</span>
                      <span className="text-primary-400 font-medium text-sm">
                        {thread.categories.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-dark-700 rounded-xl p-6 border border-dark-600">
                <h3 className="text-lg font-medium text-white mb-4">
                  {thread.categories?.name || 'Aynı Kategorideki'} Konuları
                </h3>
                {relatedThreads.length > 0 ? (
                  <div className="space-y-3">
                    {relatedThreads.map((relatedThread) => (
                      <Link
                        key={relatedThread.id}
                        href={`/forum/thread/${relatedThread.id}`}
                        className="block group"
                      >
                        <div className="p-3 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors">
                          <h4 className="text-sm font-medium text-white group-hover:text-primary-400 line-clamp-2 mb-2">
                            {relatedThread.title}
                          </h4>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>
                              {Array.isArray(relatedThread.profiles) 
                                ? (relatedThread.profiles[0]?.display_name || relatedThread.profiles[0]?.username || 'Bilinmiyor')
                                : ((relatedThread.profiles as any)?.display_name || (relatedThread.profiles as any)?.username || 'Bilinmiyor')
                              }
                            </span>
                            <span>{relatedThread.view_count} görüntüleme</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Bu kategoride başka konu bulunamadı.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType={reportType}
        targetId={reportTargetId || undefined}
        targetTitle={reportTargetTitle}
      />
    </div>
  );
} 