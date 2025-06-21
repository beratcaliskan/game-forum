import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdzdqwzwknvrcxhyvsix.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkemRxd3p3a252cmN4aHl2c2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDAzMTAsImV4cCI6MjA1MTIxNjMxMH0.VXP5_7LUVNSLVhOvIiQhb2KpLBmyXLz2PsEaHsBdUOc';

export const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?background=6366F1&color=fff&name=';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};
const AUTH_TOKEN_KEY = 'gameforumauth_token';
export type PostWithThread = {
  id: number;
  content: string;
  created_at: string;
  author_id: number;
  thread_id: number;
  threads?: {
    id: number;
    title: string;
  };
  likes?: {
    count: number;
  };
};
export type ThreadWithCategory = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author_id: number;
  category_id: number;
  categories?: {
    id: number;
    name: string;
  };
  posts?: {
    count: number;
  };
};
export type ReportType = 'thread' | 'post' | 'profile';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'hate_speech' | 'misinformation' | 'copyright_violation' | 'other';
export type ReportData = {
  reportType: ReportType;
  reason: ReportReason;
  description?: string;
  threadId?: number;
  postId?: number;
  reportedUserId?: number;
};
export const registerUser = async (username: string, email: string, password: string) => {
  try {
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    if (checkError) throw checkError;
    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Bu e-posta adresi zaten kayıtlı');
    }
    const { data: existingUsernames, error: usernameError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username);
    if (usernameError) throw usernameError;
    if (existingUsernames && existingUsernames.length > 0) {
      throw new Error('Bu kullanıcı adı zaten alınmış');
    }
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        { 
          username,
          email,
          password,
          role: 'user'
        }
      ])
      .select();
    if (userError) throw userError;
    if (!userData || userData.length === 0) {
      throw new Error('Kullanıcı oluşturulamadı');
    }
    const newUser = userData[0];
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: newUser.id,
          username: newUser.username,
          display_name: newUser.username,
          avatar_url: `${DEFAULT_AVATAR_URL}${encodeURIComponent(newUser.username)}`,
          bio: '',
          role: 'user'
        }
      ])
      .select();
    if (profileError) {
      console.error('Profil oluşturulurken hata:', profileError);
      await supabase.from('users').delete().eq('id', newUser.id);
      throw new Error('Profil oluşturulamadı');
    }
    const profile = profileData?.[0];
    const token = btoa(JSON.stringify({
      id: newUser.id,
      email: newUser.email,
      timestamp: Date.now(),
      expiry: Date.now() + (7 * 24 * 60 * 60 * 1000)
    }));
    return { 
      user: { 
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        avatar_url: profile?.avatar_url || `${DEFAULT_AVATAR_URL}${encodeURIComponent(newUser.username)}`
      }, 
      token,
      error: null 
    };
  } catch (error: any) {
    console.error('Kullanıcı kaydı sırasında hata:', error);
    return { user: null, error: error.message || 'Kayıt sırasında bir hata oluştu' };
  }
};
export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Kullanıcı bulunamadı');
    }
    const userData = data[0];
    if (userData.password !== password) {
      throw new Error('Geçersiz şifre');
    }
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userData.id)
      .single();
    if (profileError) {
      console.error('Profil bilgileri alınırken hata:', profileError);
    }
    const token = btoa(JSON.stringify({
      id: userData.id,
      email: userData.email,
      timestamp: Date.now(),
      expiry: Date.now() + (7 * 24 * 60 * 60 * 1000)
    }));
    return { 
      user: { 
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        avatar_url: profileData?.avatar_url || `${DEFAULT_AVATAR_URL}${encodeURIComponent(userData.username)}`
      }, 
      token,
      error: null 
    };
  } catch (error: any) {
    console.error('Giriş sırasında hata:', error);
    return { user: null, token: null, error: error.message || 'Giriş sırasında bir hata oluştu' };
  }
};
export const logoutUser = async () => {
  return { error: null };
};
export const validateToken = async (token: string) => {
  try {
    if (!token) {
      return { user: null, error: 'Token bulunamadı' };
    }
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch (e) {
      return { user: null, error: 'Geçersiz token formatı' };
    }
    if (tokenData.expiry < Date.now()) {
      return { user: null, error: 'Token süresi dolmuş' };
    }
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', tokenData.id);
    if (userError) throw userError;
    if (!userData || userData.length === 0) {
      return { user: null, error: 'Kullanıcı bulunamadı' };
    }
    const user = userData[0];
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single();
    if (profileError) {
      console.error('Profil bilgileri alınırken hata:', profileError);
    }
    return { 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: profileData?.avatar_url || `${DEFAULT_AVATAR_URL}${encodeURIComponent(user.username)}`
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Token doğrulama hatası:', error);
    return { user: null, error: error.message || 'Token doğrulama sırasında bir hata oluştu' };
  }
};
export const getUserProfile = async (userId: number) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);
    if (userError) throw userError;
    if (!userData || userData.length === 0) {
      throw new Error('Kullanıcı bulunamadı');
    }
    const user = userData[0];
    const joinedDate = user.created_at 
      ? new Date(user.created_at).toLocaleDateString('tr-TR')
      : null;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, bio, display_name, avatar_url')
      .eq('user_id', userId)
      .single();
    if (profileError) {
      console.error('Profil bilgileri alınırken hata:', profileError);
    }
    const authorId = profileData?.id || null;
    const bio = profileData?.bio || '';
    const displayName = profileData?.display_name || user.username;
    const profileAvatar = profileData?.avatar_url;
    let threadCount = 0, postCount = 0, likeCount = 0, followerCount = 0;
    let latestThreads: ThreadWithCategory[] = [];
    let latestPosts: PostWithThread[] = [];
    if (authorId !== null) {
      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .select('id')
        .eq('author_id', authorId);
      threadCount = threadData?.length || 0;
      if (threadError) console.error('Konu sayısı alınırken hata:', threadError);
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', authorId);
      postCount = postData?.length || 0;
      if (postError) console.error('Gönderi sayısı alınırken hata:', postError);
      if (postData && postData.length > 0) {
        const { data: likeData, error: likeError } = await supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postData.map(post => post.id));
        likeCount = likeData?.length || 0;
        if (likeError) console.error('Beğeni sayısı alınırken hata:', likeError);
      }
      const { data: followerData, error: followerError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', authorId);
      followerCount = followerData?.length || 0;
      if (followerError) console.error('Takipçi sayısı alınırken hata:', followerError);
      latestThreads = await getUserLatestThreads(authorId, 5);
      latestPosts = await getUserLatestPosts(authorId, 5);
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: profileAvatar || `${DEFAULT_AVATAR_URL}${encodeURIComponent(user.username)}`,
      display_name: displayName,
      bio: bio,
      role: user.role || 'user',
      profile_id: authorId,
      stats: {
        threadCount,
        postCount,
        likeCount,
        followerCount,
        joined: joinedDate
      },
      latestThreads,
      latestPosts
    };
  } catch (error) {
    console.error('Kullanıcı profili alınırken hata oluştu:', error);
    return null;
  }
};
export const getUserLatestPosts = async (profileId: number, limit: number = 5): Promise<PostWithThread[]> => {
  try {
    console.log('Fetching posts for profile:', profileId);
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        author_id,
        thread_id,
        threads!inner (
          id,
          title
        ),
        likes (
          count
        )
      `)
      .eq('author_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (postError) {
      console.error('Post fetch error:', postError);
      throw postError;
    }
    console.log('Fetched posts:', postData);

    const transformedPosts: PostWithThread[] = (postData || []).map((post: any) => ({
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      author_id: post.author_id,
      thread_id: post.thread_id,
      threads: Array.isArray(post.threads) ? post.threads[0] : post.threads,
      likes: post.likes?.[0] || { count: 0 }
    }));
    
    return transformedPosts;
  } catch (error) {
    console.error('Kullanıcının son gönderileri alınırken hata:', error);
    return [];
  }
};
export const getUserLatestThreads = async (profileId: number, limit: number = 5): Promise<ThreadWithCategory[]> => {
  try {
    console.log('Fetching threads for profile:', profileId);
    const { data: threadData, error: threadError } = await supabase
      .from('threads')
      .select(`
        id,
        title,
        content,
        created_at,
        author_id,
        category_id,
        categories!inner (
          id,
          name
        ),
        posts (
          count
        )
      `)
      .eq('author_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (threadError) {
      console.error('Thread fetch error:', threadError);
      throw threadError;
    }
    console.log('Fetched threads:', threadData);
    

    const transformedThreads: ThreadWithCategory[] = (threadData || []).map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      created_at: thread.created_at,
      author_id: thread.author_id,
      category_id: thread.category_id,
      categories: Array.isArray(thread.categories) ? thread.categories[0] : thread.categories,
      posts: thread.posts?.[0] || { count: 0 }
    }));
    
    return transformedThreads;
  } catch (error) {
    console.error('Kullanıcının son konuları alınırken hata:', error);
    return [];
  }
};
export const likeThread = async (threadId: number, userId: number) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const profileId = profileData.id;
    const { error } = await supabase
      .from('thread_likes')
      .insert([{
        user_id: profileId,
        thread_id: threadId
      }]);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Thread beğeni hatası:', error);
    return { error: error.message || 'Thread beğenilirken bir hata oluştu' };
  }
};
export const unlikeThread = async (threadId: number, userId: number) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const profileId = profileData.id;
    const { error } = await supabase
      .from('thread_likes')
      .delete()
      .eq('user_id', profileId)
      .eq('thread_id', threadId);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Thread beğeni kaldırma hatası:', error);
    return { error: error.message || 'Thread beğenisi kaldırılırken bir hata oluştu' };
  }
};
export const getThreadLikeCount = async (threadId: number) => {
  try {
    const { count, error } = await supabase
      .from('thread_likes')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId);
    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error: any) {
    console.error('Thread beğeni sayısı alma hatası:', error);
    return { count: 0, error: error.message };
  }
};
export const checkUserThreadLike = async (threadId: number, userId: number) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const profileId = profileData.id;
    const { data, error } = await supabase
      .from('thread_likes')
      .select('*')
      .eq('user_id', profileId)
      .eq('thread_id', threadId)
      .single();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { isLiked: !!data, error: null };
  } catch (error: any) {
    console.error('Thread beğeni kontrolü hatası:', error);
    return { isLiked: false, error: error.message };
  }
};
export const submitReport = async (reportData: ReportData, reporterId: number) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', reporterId)
      .single();
    if (profileError) throw profileError;
    const reporterProfileId = profileData.id;
    const insertData: any = {
      reporter_id: reporterProfileId,
      report_type: reportData.reportType,
      reason: reportData.reason,
      description: reportData.description || null
    };
    if (reportData.reportType === 'thread' && reportData.threadId) {
      insertData.thread_id = reportData.threadId;
      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .select('author_id')
        .eq('id', reportData.threadId)
        .single();
      if (!threadError && threadData) {
        insertData.reported_user_id = threadData.author_id;
      }
    } else if (reportData.reportType === 'post' && reportData.postId) {
      insertData.post_id = reportData.postId;
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', reportData.postId)
        .single();
      if (!postError && postData) {
        insertData.reported_user_id = postData.author_id;
      }
    } else if (reportData.reportType === 'profile' && reportData.reportedUserId) {
      const { data: reportedProfileData, error: reportedProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', reportData.reportedUserId)
        .single();
      if (reportedProfileError) throw reportedProfileError;
      insertData.reported_user_id = reportedProfileData.id;
    }
    const { error } = await supabase
      .from('reports')
      .insert([insertData]);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Şikayet gönderme hatası:', error);
    return { error: error.message || 'Şikayet gönderilirken bir hata oluştu' };
  }
};
export const checkExistingReport = async (reportData: ReportData, reporterId: number) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', reporterId)
      .single();
    if (profileError) throw profileError;
    const reporterProfileId = profileData.id;
    let query = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterProfileId)
      .eq('report_type', reportData.reportType);
    if (reportData.reportType === 'thread' && reportData.threadId) {
      query = query.eq('thread_id', reportData.threadId);
    } else if (reportData.reportType === 'post' && reportData.postId) {
      query = query.eq('post_id', reportData.postId);
    } else if (reportData.reportType === 'profile' && reportData.reportedUserId) {
      const { data: reportedProfileData, error: reportedProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', reportData.reportedUserId)
        .single();
      if (reportedProfileError) throw reportedProfileError;
      query = query.eq('reported_user_id', reportedProfileData.id);
    }
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { exists: !!data, error: null };
  } catch (error: any) {
    console.error('Mevcut şikayet kontrolü hatası:', error);
    return { exists: false, error: error.message };
  }
};
export const followUser = async (followerId: number, followingId: number) => {
  try {
    const { data: followerProfile, error: followerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followerId)
      .single();
    if (followerError) throw followerError;
    const { data: followingProfile, error: followingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followingId)
      .single();
    if (followingError) throw followingError;
    const { error } = await supabase
      .from('follows')
      .insert([{
        follower_id: followerProfile.id,
        following_id: followingProfile.id
      }]);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Takip etme hatası:', error);
    return { error: error.message || 'Takip edilirken bir hata oluştu' };
  }
};
export const unfollowUser = async (followerId: number, followingId: number) => {
  try {
    const { data: followerProfile, error: followerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followerId)
      .single();
    if (followerError) throw followerError;
    const { data: followingProfile, error: followingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followingId)
      .single();
    if (followingError) throw followingError;
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerProfile.id)
      .eq('following_id', followingProfile.id);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Takibi bırakma hatası:', error);
    return { error: error.message || 'Takip bırakılırken bir hata oluştu' };
  }
};
export const checkFollowStatus = async (followerId: number, followingId: number) => {
  try {
    const { data: followerProfile, error: followerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followerId)
      .single();
    if (followerError) throw followerError;
    const { data: followingProfile, error: followingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', followingId)
      .single();
    if (followingError) throw followingError;
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerProfile.id)
      .eq('following_id', followingProfile.id)
      .single();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { isFollowing: !!data, error: null };
  } catch (error: any) {
    console.error('Takip durumu kontrolü hatası:', error);
    return { isFollowing: false, error: error.message };
  }
};
export const getFollowCounts = async (userId: number) => {
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const { count: followerCount, error: followerError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userProfile.id);
    if (followerError) throw followerError;
    const { count: followingCount, error: followingError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userProfile.id);
    if (followingError) throw followingError;
    return { 
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
      error: null 
    };
  } catch (error: any) {
    console.error('Takip sayıları alma hatası:', error);
    return { followerCount: 0, followingCount: 0, error: error.message };
  }
};
export const getFollowersList = async (userId: number) => {
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const { data: followers, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey (
          user_id,
          display_name,
          avatar_url,
          users!profiles_user_id_fkey (
            username
          )
        )
      `)
      .eq('following_id', userProfile.id);
    if (error) throw error;
    const formattedFollowers = followers?.map((follow: any) => ({
      id: follow.profiles?.user_id,
      username: Array.isArray(follow.profiles?.users) ? follow.profiles?.users[0]?.username : follow.profiles?.users?.username,
      display_name: follow.profiles?.display_name || (Array.isArray(follow.profiles?.users) ? follow.profiles?.users[0]?.username : follow.profiles?.users?.username),
      avatar_url: follow.profiles?.avatar_url
    })) || [];
    return { followers: formattedFollowers, error: null };
  } catch (error: any) {
    console.error('Takipçi listesi alma hatası:', error);
    return { followers: [], error: error.message };
  }
};
export const getFollowingList = async (userId: number) => {
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;
    const { data: following, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey (
          user_id,
          display_name,
          avatar_url,
          users!profiles_user_id_fkey (
            username
          )
        )
      `)
      .eq('follower_id', userProfile.id);
    if (error) throw error;
    const formattedFollowing = following?.map((follow: any) => ({
      id: follow.profiles?.user_id,
      username: Array.isArray(follow.profiles?.users) ? follow.profiles?.users[0]?.username : follow.profiles?.users?.username,
      display_name: follow.profiles?.display_name || (Array.isArray(follow.profiles?.users) ? follow.profiles?.users[0]?.username : follow.profiles?.users?.username),
      avatar_url: follow.profiles?.avatar_url
    })) || [];
    return { following: formattedFollowing, error: null };
  } catch (error: any) {
    console.error('Takip edilen listesi alma hatası:', error);
    return { following: [], error: error.message };
  }
}; 