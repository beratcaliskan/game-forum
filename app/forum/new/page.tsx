'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { FaArrowLeft, FaPaperPlane, FaTimes, FaGamepad } from 'react-icons/fa';

type Category = {
  id: number;
  name: string;
  description?: string;
};

// Component that uses useSearchParams - wrapped in Suspense
function NewThreadForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, description')
          .order('name');
        if (error) throw error;
        setCategories(data || []);

        const categoryParam = searchParams.get('category');
        if (categoryParam && data) {
          const category = data.find(cat => cat.name === categoryParam);
          if (category) {
            setSelectedCategory(category.id);
          }
        }
      } catch (error: any) {
        console.error('Kategoriler alınırken hata:', error);
      }
    };
    fetchCategories();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Konu açmak için giriş yapmalısınız');
      return;
    }
    if (!title.trim()) {
      setError('Konu başlığı gereklidir');
      return;
    }
    if (!content.trim()) {
      setError('Konu içeriği gereklidir');
      return;
    }
    if (!selectedCategory) {
      setError('Kategori seçimi gereklidir');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (profileError) throw profileError;

      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .insert({
          title: title.trim(),
          content: content.trim(),
          author_id: profileData.id,
          category_id: selectedCategory,
          view_count: 0,
        })
        .select()
        .single();
      if (threadError) throw threadError;

      router.push(`/forum/thread/${threadData.id}`);
    } catch (error: any) {
      console.error('Konu oluşturulurken hata:', error);
      setError('Konu oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setContent('');
    setSelectedCategory(null);
    setError(null);
  };

  if (!user) {
    return (
      <div className="bg-dark-900 min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl text-primary-500 mb-6">
            <FaGamepad />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Giriş Yapın
          </h1>
          <p className="text-gray-400 mb-6">
            Yeni konu açmak için önce giriş yapmalısınız.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/auth/login"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Giriş Yap
            </Link>
            <Link 
              href="/forum"
              className="bg-dark-700 hover:bg-dark-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Foruma Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Yeni Konu Aç</h1>
            <p className="text-gray-400">
              Topluluğumuzla paylaşmak istediğiniz konuyu yazın
            </p>
          </div>
          <Link 
            href="/forum"
            className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors"
          >
            <FaArrowLeft />
            <span>Foruma Dön</span>
          </Link>
        </div>
        <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-red-100"
                >
                  <FaTimes />
                </button>
              </div>
            )}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Konu Başlığı *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Açıklayıcı bir başlık yazın..."
                maxLength={200}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {title.length}/200 karakter
              </p>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                Kategori *
              </label>
              <select
                id="category"
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Kategori seçin...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.description && ` - ${category.description}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                Konu İçeriği *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Konunuzun detaylarını yazın. Markdown formatı desteklenir..."
                rows={12}
                maxLength={5000}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {content.length}/5000 karakter
              </p>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Markdown Formatı</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <p><code className="bg-dark-600 px-1 rounded">**kalın metin**</code> → <strong>kalın metin</strong></p>
                <p><code className="bg-dark-600 px-1 rounded">*italik metin*</code> → <em>italik metin</em></p>
                <p><code className="bg-dark-600 px-1 rounded">[link](https://örnek.com)</code> → link</p>
                <p><code className="bg-dark-600 px-1 rounded">`kod`</code> → <code>kod</code></p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-dark-600">
              <button
                type="button"
                onClick={clearForm}
                className="px-6 py-3 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg transition-colors"
              >
                Temizle
              </button>
              <div className="flex gap-3">
                <Link
                  href="/forum"
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !content.trim() || !selectedCategory}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Oluşturuluyor...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      <span>Konu Aç</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="mt-8 bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h3 className="text-lg font-medium text-white mb-4">Topluluk Kuralları</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• Saygılı ve yapıcı bir dil kullanın</li>
            <li>• Spam ve tekrarlanan içeriklerden kaçının</li>
            <li>• Konunuzu uygun kategoride açın</li>
            <li>• Açıklayıcı başlıklar kullanın</li>
            <li>• Telif hakkı ihlali yapmayın</li>
            <li>• Kişisel saldırılardan kaçının</li>
          </ul>
        </div>
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
export default function NewThreadPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewThreadForm />
    </Suspense>
  );
} 