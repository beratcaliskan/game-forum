import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch data from all tables
    const [
      usersResult,
      profilesResult,
      categoriesResult,
      threadsResult,
      postsResult,
      likesResult,
      threadLikesResult,
      reportsResult,
      followsResult,
      userSettingsResult
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('threads').select('*'),
      supabase.from('posts').select('*'),
      supabase.from('likes').select('*'),
      supabase.from('thread_likes').select('*'),
      supabase.from('reports').select('*'),
      supabase.from('follows').select('*'),
      supabase.from('user_settings').select('*')
    ]);

    // Check for any errors
    const errors = [
      usersResult.error,
      profilesResult.error,
      categoriesResult.error,
      threadsResult.error,
      postsResult.error,
      likesResult.error,
      threadLikesResult.error,
      reportsResult.error,
      followsResult.error,
      userSettingsResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Database errors:', errors);
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }

    // Prepare the response data
    const tables = {
      users: usersResult.data || [],
      profiles: profilesResult.data || [],
      categories: categoriesResult.data || [],
      threads: threadsResult.data || [],
      posts: postsResult.data || [],
      likes: likesResult.data || [],
      thread_likes: threadLikesResult.data || [],
      reports: reportsResult.data || [],
      follows: followsResult.data || [],
      user_settings: userSettingsResult.data || []
    };

    // Calculate statistics
    const stats = {
      users: tables.users.length,
      profiles: tables.profiles.length,
      categories: tables.categories.length,
      threads: tables.threads.length,
      posts: tables.posts.length,
      likes: tables.likes.length,
      thread_likes: tables.thread_likes.length,
      reports: tables.reports.length,
      follows: tables.follows.length,
      user_settings: tables.user_settings.length
    };

    return NextResponse.json({
      tables,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 