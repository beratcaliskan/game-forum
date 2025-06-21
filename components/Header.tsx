'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../lib/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { FaGamepad, FaBars, FaTimes, FaSearch, FaUser, FaSpinner } from 'react-icons/fa';
import { DEFAULT_AVATAR_URL, supabase } from '../lib/supabase';
type SearchResult = {
  id: number;
  title: string;
  type: 'thread' | 'user';
  content?: string;
  username?: string;
  avatar_url?: string;
  category?: string;
};
export default function Header() {
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'threads' | 'users'>('all');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearchLoading(true);
    setShowResults(true);
    try {
      const results: SearchResult[] = [];
      if (selectedFilter === 'all' || selectedFilter === 'threads') {
                 const { data: threads, error: threadsError } = await supabase
           .from('threads')
           .select(`
             id,
             title,
             content,
             categories(name)
           `)
           .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
           .limit(5);
         if (!threadsError && threads) {
           threads.forEach((thread: any) => {
             results.push({
               id: thread.id,
               title: thread.title,
               type: 'thread',
               content: thread.content,
               category: thread.categories?.name
             });
           });
         }
      }
      if (selectedFilter === 'all' || selectedFilter === 'users') {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select(`
            id,
            username,
            profiles(avatar_url)
          `)
          .ilike('username', `%${query}%`)
          .limit(3);
        if (!usersError && users) {
          users.forEach(user => {
            const profile = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles;
            results.push({
              id: user.id,
              title: user.username,
              type: 'user',
              username: user.username,
              avatar_url: profile?.avatar_url
            });
          });
        }
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFilter]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };
  const handleResultClick = () => {
    clearSearch();
    setSearchOpen(false);
  };
  return (
    <header className="bg-dark-900 text-white shadow-md relative z-30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary-500">
            <FaGamepad className="text-2xl" />
            <span>GameForum</span>
          </Link>
          <nav className="hidden md:flex gap-6 items-center">
            <Link href="/forum" className="hover:text-primary-500 transition-colors font-medium">
              Forum
            </Link>
            <Link href="/haberler" className="hover:text-primary-500 transition-colors font-medium">
              Haberler
            </Link>
            <Link href="/incelemeler" className="hover:text-primary-500 transition-colors font-medium">
              İncelemeler
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <div className="relative" ref={searchRef}>
            <div className="relative">
              <input 
                  ref={inputRef}
                type="text" 
                  placeholder="Konularda ve kullanıcılarda ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowResults(true)}
                  className="bg-dark-800 border border-dark-700 hover:border-primary-500/50 focus:border-primary-500 rounded-lg px-4 py-2 pr-10 w-64 focus:w-80 transition-all outline-none text-sm"
              />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {searchLoading ? (
                    <FaSpinner className="animate-spin text-primary-400" />
                  ) : (
                    <FaSearch className="text-gray-400" />
                  )}
                </div>
              </div>
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 max-w-md">
                  <div className="flex border-b border-dark-700 p-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedFilter('all')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        selectedFilter === 'all' 
                          ? 'bg-primary-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      onClick={() => setSelectedFilter('threads')}
                      className={`px-3 py-1 text-xs rounded transition-colors ml-1 ${
                        selectedFilter === 'threads' 
                          ? 'bg-primary-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Konular
                    </button>
                    <button
                      onClick={() => setSelectedFilter('users')}
                      className={`px-3 py-1 text-xs rounded transition-colors ml-1 ${
                        selectedFilter === 'users' 
                          ? 'bg-primary-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Kullanıcılar
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <div key={`${result.type}-${result.id}`}>
                          {result.type === 'thread' ? (
                            <Link
                              href={`/forum/thread/${result.id}`}
                              onClick={handleResultClick}
                              className="block p-3 hover:bg-dark-700 transition-colors border-b border-dark-700/50 last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-primary-500/20 rounded flex items-center justify-center flex-shrink-0 mt-1">
                                  <FaGamepad className="text-primary-400 text-xs" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-white truncate">
                                    {result.title}
                                  </h4>
                                  {result.content && (
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                      {result.content.substring(0, 100)}...
                                    </p>
                                  )}
                                  {result.category && (
                                    <span className="inline-block text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded mt-2">
                                      {result.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <Link
                              href={`/profile/${result.username}`}
                              onClick={handleResultClick}
                              className="block p-3 hover:bg-dark-700 transition-colors border-b border-dark-700/50 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {result.avatar_url ? (
                                    <Image 
                                      src={result.avatar_url} 
                                      alt={result.username || ''} 
                                      width={32} 
                                      height={32} 
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <Image 
                                      src={`${DEFAULT_AVATAR_URL}${encodeURIComponent(result.username || '')}`}
                                      alt={result.username || ''} 
                                      width={32} 
                                      height={32} 
                                      className="object-cover w-full h-full"
                                    />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-white">
                                    @{result.username}
                                  </h4>
                                  <p className="text-xs text-gray-400">Kullanıcı</p>
                                </div>
                              </div>
                            </Link>
                          )}
                        </div>
                      ))
                    ) : searchQuery && !searchLoading ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        Sonuç bulunamadı
                      </div>
                    ) : !searchQuery ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        Aramaya başlamak için yazın...
                      </div>
                    ) : null}
                  </div>
                  {searchQuery && (
                    <div className="border-t border-dark-700 p-3 flex-shrink-0">
                      <Link
                        href={`/forum?search=${encodeURIComponent(searchQuery)}`}
                        onClick={handleResultClick}
                        className="block text-center text-sm text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        "{searchQuery}" için tüm sonuçları görüntüle
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <button className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-500/50 px-3 py-2 rounded-lg transition-all">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 overflow-hidden">
                          {user.avatar_url ? (
                            <Image 
                              src={user.avatar_url} 
                              alt={user.username} 
                              width={32} 
                              height={32} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <Image 
                              src={`${DEFAULT_AVATAR_URL}${encodeURIComponent(user.username)}`}
                              alt={user.username} 
                              width={32} 
                              height={32} 
                              className="object-cover w-full h-full"
                            />
                          )}
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-lg overflow-hidden invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="p-2">
                          <Link 
                            href="/profile" 
                            className="block px-4 py-2 text-sm text-gray-200 hover:bg-primary-500 hover:text-white rounded transition-colors"
                          >
                            Profilim
                          </Link>
                          {(user.role === 'admin' || user.role === 'moderator') && (
                            <Link 
                              href="/admin" 
                              className="block px-4 py-2 text-sm text-gray-200 hover:bg-primary-500 hover:text-white rounded transition-colors"
                            >
                              Admin Paneli
                            </Link>
                          )}
                          <Link 
                            href="/settings" 
                            className="block px-4 py-2 text-sm text-gray-200 hover:bg-primary-500 hover:text-white rounded transition-colors"
                          >
                            Ayarlar
                          </Link>
                          <button
                            onClick={() => logout()}
                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-primary-500 hover:text-white rounded transition-colors"
                          >
                            Çıkış Yap
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link 
                      href="/auth/login"
                      className="text-gray-200 hover:text-primary-500 transition-colors"
                    >
                      Giriş Yap
                    </Link>
                    <Link 
                      href="/auth/register"
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex md:hidden items-center gap-4">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-gray-300 hover:text-primary-500 transition-colors"
            >
              <FaSearch className="text-xl" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-primary-500 transition-colors"
            >
              {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>
      </div>
      {searchOpen && (
        <div className="md:hidden px-4 py-3 bg-dark-800 border-t border-dark-700">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Konularda ve kullanıcılarda ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dark-900 border border-dark-700 hover:border-primary-500/50 focus:border-primary-500 rounded-lg px-4 py-2 pr-10 w-full outline-none"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {searchLoading ? (
                <FaSpinner className="animate-spin text-primary-400" />
              ) : (
                <FaSearch className="text-gray-400" />
              )}
            </div>
          </div>
          {searchResults.length > 0 && searchQuery && (
            <div className="mt-3 bg-dark-900 border border-dark-700 rounded-lg max-h-64 overflow-y-auto">
              {searchResults.slice(0, 3).map((result) => (
                <div key={`${result.type}-${result.id}`}>
                  {result.type === 'thread' ? (
                    <Link
                      href={`/forum/thread/${result.id}`}
                      onClick={() => {
                        clearSearch();
                        setSearchOpen(false);
                      }}
                      className="block p-3 hover:bg-dark-700 transition-colors border-b border-dark-700/50 last:border-b-0"
                    >
                      <h4 className="text-sm font-medium text-white truncate">
                        {result.title}
                      </h4>
                      {result.category && (
                        <span className="inline-block text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded mt-1">
                          {result.category}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <Link
                      href={`/profile/${result.username}`}
                      onClick={() => {
                        clearSearch();
                        setSearchOpen(false);
                      }}
                      className="block p-3 hover:bg-dark-700 transition-colors border-b border-dark-700/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden">
                          <FaUser className="text-primary-400 text-xs" />
                        </div>
                        <span className="text-sm text-white">@{result.username}</span>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {mobileMenuOpen && (
        <div className="md:hidden bg-dark-800 border-t border-dark-700">
          <nav className="flex flex-col py-4">
            <Link 
              href="/forum" 
              className="px-4 py-3 hover:bg-dark-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Forum
            </Link>
            <Link 
              href="/haberler" 
              className="px-4 py-3 hover:bg-dark-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Haberler
            </Link>
            <Link 
              href="/incelemeler" 
              className="px-4 py-3 hover:bg-dark-700 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              İncelemeler
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="border-t border-dark-700 my-2"></div>
                    <div className="px-4 py-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <Image 
                            src={user.avatar_url} 
                            alt={user.username} 
                            width={40} 
                            height={40} 
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Image 
                            src={`${DEFAULT_AVATAR_URL}${encodeURIComponent(user.username)}`}
                            alt={user.username} 
                            width={40} 
                            height={40} 
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                    <Link 
                      href="/profile" 
                      className="px-4 py-3 hover:bg-dark-700 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profilim
                    </Link>
                    {(user.role === 'admin' || user.role === 'moderator') && (
                      <Link 
                        href="/admin" 
                        className="px-4 py-3 hover:bg-dark-700 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Paneli
                      </Link>
                    )}
                    <Link 
                      href="/settings" 
                      className="px-4 py-3 hover:bg-dark-700 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Ayarlar
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-dark-700 transition-colors"
                    >
                      Çıkış Yap
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border-t border-dark-700 my-2"></div>
                    <Link 
                      href="/auth/login" 
                      className="px-4 py-3 hover:bg-dark-700 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Giriş Yap
                    </Link>
                    <Link 
                      href="/auth/register" 
                      className="px-4 py-3 hover:bg-dark-700 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Kayıt Ol
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 