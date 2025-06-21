-- 🗑️ Önce mevcut tabloları temizle (eğer varsa)
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS thread_likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 👤 KULLANICI ROL ENUMu
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');

-- 👤 Kullanıcılar Tablosu
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🧑 Profil Bilgileri
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT CHECK (role IN ('admin', 'moderator', 'user')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📂 Kategoriler
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💬 Konular (Threads)
CREATE TABLE threads (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📝 Gönderiler (Posts)
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 👍 Beğeniler (Post'lar için)
CREATE TABLE likes (
  user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 👍 Thread Beğenileri
CREATE TABLE thread_likes (
  user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, thread_id)
);

-- Thread_likes tablosu için RLS politikaları
ALTER TABLE thread_likes ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi beğenilerini görebilir ve yönetebilir
CREATE POLICY "Users can manage their own thread likes" ON thread_likes
  FOR ALL USING (
    user_id IN (
      SELECT p.id FROM profiles p 
      JOIN users u ON p.user_id = u.id 
      WHERE u.id = (auth.uid()::text)::integer
    )
  );

-- Herkes thread beğeni sayılarını görebilir (COUNT için)
CREATE POLICY "Anyone can view thread like counts" ON thread_likes
  FOR SELECT USING (true);

-- 🚨 Şikayetler
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('thread', 'post', 'profile')) NOT NULL,
  reason TEXT CHECK (reason IN (
    'spam', 
    'harassment', 
    'inappropriate_content', 
    'hate_speech', 
    'misinformation', 
    'copyright_violation',
    'other'
  )) NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  
  -- En az bir şikayet hedefi olmalı (thread, post veya profile)
  CHECK (
    (report_type = 'thread' AND thread_id IS NOT NULL) OR
    (report_type = 'post' AND post_id IS NOT NULL) OR
    (report_type = 'profile' AND reported_user_id IS NOT NULL)
  )
);

-- Reports tablosu için RLS politikaları
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi şikayetlerini görebilir
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (
    reporter_id IN (
      SELECT p.id FROM profiles p 
      JOIN users u ON p.user_id = u.id 
      WHERE u.id = (auth.uid()::text)::integer
    )
  );

-- Kullanıcılar şikayet gönderebilir
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (
    reporter_id IN (
      SELECT p.id FROM profiles p 
      JOIN users u ON p.user_id = u.id 
      WHERE u.id = (auth.uid()::text)::integer
    )
  );

-- Moderatörler ve adminler tüm şikayetleri görebilir
CREATE POLICY "Moderators can view all reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (auth.uid()::text)::integer
      AND u.role IN ('admin', 'moderator')
    )
  );

-- Moderatörler ve adminler şikayetleri güncelleyebilir
CREATE POLICY "Moderators can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (auth.uid()::text)::integer
      AND u.role IN ('admin', 'moderator')
    )
  );

-- 👥 Takipler
CREATE TABLE follows (
  follower_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  following_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ⚙️ Kullanıcı Ayarları
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Gizlilik Ayarları
  show_likes BOOLEAN DEFAULT TRUE,
  show_followers BOOLEAN DEFAULT TRUE,
  show_following BOOLEAN DEFAULT TRUE,
  show_online_status BOOLEAN DEFAULT TRUE,
  show_profile_to_guests BOOLEAN DEFAULT TRUE,
  allow_messages BOOLEAN DEFAULT TRUE,
  
  -- Bildirim Ayarları
  email_notifications BOOLEAN DEFAULT TRUE,
  like_notifications BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  follow_notifications BOOLEAN DEFAULT TRUE,
  thread_notifications BOOLEAN DEFAULT TRUE,
  mobile_notifications BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================
-- 📊 ÖRNEK VERİLER
-- =======================================

-- 👤 Örnek Kullanıcılar
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@oyunforum.com', 'admin123', 'admin'),
('moderator', 'mod@oyunforum.com', 'mod123', 'moderator'),
('gamemaster', 'gm@oyunforum.com', 'gm123', 'user'),
('proPlayer', 'pro@oyunforum.com', 'pro123', 'user'),
('casualGamer', 'casual@oyunforum.com', 'casual123', 'user'),
('techGuru', 'tech@oyunforum.com', 'tech123', 'user');

-- 🧑 Örnek Profiller
INSERT INTO profiles (user_id, username, display_name, avatar_url, bio, role) VALUES
(1, 'admin', 'Forum Yöneticisi', 'https://ui-avatars.com/api/?background=dc2626&color=fff&name=Admin', 'Oyun forum topluluğunun yöneticisi. Sorularınız için mesaj atabilirsiniz.', 'admin'),
(2, 'moderator', 'Forum Moderatörü', 'https://ui-avatars.com/api/?background=ea580c&color=fff&name=Mod', 'Forum kurallarını takip eden dostane moderatör.', 'moderator'),
(3, 'gamemaster', 'Oyun Ustası', 'https://ui-avatars.com/api/?background=7c3aed&color=fff&name=GM', 'MMORPG oyunlarının tutku haline. 15 yıllık oyun deneyimi.', 'user'),
(4, 'proPlayer', 'Pro Oyuncu', 'https://ui-avatars.com/api/?background=059669&color=fff&name=Pro', 'E-spor yarışmalarında aktif. FPS ve MOBA oyunlarında uzman.', 'user'),
(5, 'casualGamer', 'Gündelik Oyuncu', 'https://ui-avatars.com/api/?background=0284c7&color=fff&name=Casual', 'Boş zamanlarımda oyun oynayan rahat bir oyuncu.', 'user'),
(6, 'techGuru', 'Teknoloji Gurusu', 'https://ui-avatars.com/api/?background=db2777&color=fff&name=Tech', 'PC toplama ve oyun optimizasyonu konularında uzman.', 'user');

-- 📂 Kategoriler
INSERT INTO categories (name, description) VALUES
('MMORPG', 'Massively Multiplayer Online Role-Playing Games'),
('FPS', 'First Person Shooter oyunları'),
('MOBA', 'Multiplayer Online Battle Arena oyunları'),
('RPG', 'Role Playing Games - Rol yapma oyunları'),
('Strateji', 'Strateji ve taktik oyunları'),
('Yarış', 'Araba yarışı ve simülasyon oyunları'),
('Indie Games', 'Bağımsız geliştiriciler tarafından yapılan oyunlar'),
('Teknoloji', 'Oyun donanımı ve teknoloji tartışmaları'),
('Genel Tartışma', 'Genel oyun tartışmaları ve sohbet'),
('İncelemeler', 'Oyun incelemeleri ve değerlendirmeleri'),
('Haberler', 'Oyun haberleri ve duyurular');

-- 💬 Örnek Konular (Threads)
INSERT INTO threads (title, content, author_id, category_id, view_count) VALUES
-- MMORPG kategorisi (id: 1)
('WoW''da En İyi Class Hangisi?', 'Yeni başlayan arkadaşlar için hangi class''ı önerirsiniz? PvP ve PvE açısından değerlendirme yapabilir misiniz?', 3, 1, 150),
('Guild Recruitment - Horde', 'Targaryen adlı guild''imiz aktif oyuncular arıyor. Raid saatlerimiz hafta içi 21:00-24:00 arası. Detaylar için mesaj atın.', 3, 1, 89),

-- FPS kategorisi (id: 2)  
('CS2 Rank Sistemi Nasıl Çalışıyor?', 'Counter-Strike 2''deki yeni rank sistemini anlayamadım. Eskiden Global Elite''tim şimdi ne olmaya çalışıyor anlamadım.', 4, 2, 234),
('Valorant Agent Tier List 2024', 'Güncel meta''ya göre hangi agent''lar daha güçlü? Özellikle Ascendant+ ranklar için öneri var mı?', 4, 2, 178),

-- MOBA kategorisi (id: 3)
('LoL Sezon 14 Değişiklikleri', 'Yeni sezonla gelen değişiklikler hakkında ne düşünüyorsunuz? Özellikle jungle değişiklikleri çok radikal geldi.', 4, 3, 312),
('Dota 2 vs LoL Hangisi Daha İyi?', 'İki oyunu da oynayan arkadaşlar hangisini tercih ediyorsunuz ve neden? Yeni başlayanlar için hangisi daha uygun?', 5, 3, 445),

-- Teknoloji kategorisi (id: 8)
('Gaming PC Toplama Rehberi 2024', 'Oyun için PC toplamak isteyenlere güncel öneriler. 15K, 25K ve 40K bütçeler için parça listesi hazırladım.', 6, 8, 567),

-- Genel kategorisi (id: 9)
('Oyun Bağımlılığı ve Dengeli Yaşam', 'Oyun oynama süremizi nasıl kontrol edebiliriz? Sağlıklı oyun alışkanlıkları geliştirme üzerine...', 2, 9, 289),

-- Haberler kategorisi (id: 11)
('PlayStation 5 Pro Duyuruldu!', 'Sony yeni nesil konsolunu duyurdu. Teknik özellikleri ve fiyatı hakkında ne düşünüyorsunuz?', 1, 11, 892),
('Steam Autumn Sale Başladı', 'Steam''de sonbahar indirimleri başladı. En iyi fırsatları bu başlık altında paylaşalım.', 2, 11, 456),
('GTA 6 İlk Trailer Yayınlandı', 'Rockstar Games nihayet GTA 6''nın ilk fragmanını yayınladı. İlk izlenimlerinizi paylaşın!', 3, 11, 1234),

-- İncelemeler kategorisi (id: 10)
('RTX 4070 vs RTX 4070 Ti Karşılaştırması', 'Bu iki kartı karşılaştırdım, performans farkı ve fiyat/performans açısından değerlendirmem. 1080p, 1440p ve 4K testler dahil.', 6, 10, 389),
('2024''ün En İyi Oyunları', 'Bu yıl çıkan oyunlardan hangilerini beğendiniz? Detaylı inceleme ve puanlamalarım: Elden Ring DLC, Helldivers 2, Baldur''s Gate 3...', 5, 10, 678),
('Elden Ring Shadow of the Erdtree İncelemesi', 'FromSoftware''in yeni DLC''sini baştan sona oynadım. Boss tasarımları, hikaye ve oynanış açısından detaylı değerlendirmem.', 3, 10, 445),
('Cyberpunk 2077 2024 Durumu', '2024 yılında Cyberpunk 2077''nin durumu nasıl? Tüm yamalar ve iyileştirmeler sonrası oyunun güncel incelemesi.', 1, 10, 523);

-- 📝 Örnek Gönderiler (Posts)
INSERT INTO posts (content, author_id, thread_id) VALUES
-- Thread 1: WoW Class önerileri
('Ben Death Knight öneriyorum. Hem PvE''de tank olarak hem de DPS olarak oynayabilirsin. Yeni başlayanlar için ideal.', 1, 1),
('Hunter''a bir bak derim. Kolay öğrenilir, solo oynanabilir ve hem PvP hem PvE''de etkili.', 4, 1),
('Paladin her zaman güvenli seçim. Heal, tank, DPS... Her rolü oynayabilirsin.', 5, 1),

-- Thread 2: Guild Recruitment
('Guild''inizi merak ettim. Hangi sunucudasınız? Ben de aktif Horde oyuncusuyum.', 4, 2),
('Raid deneyimi şart mı? Ben yeni başladım WoW''a ama hızlı öğreniyorum.', 5, 2),

-- Thread 3: CS2 Rank Sistemi
('CS2 rank sistemi gerçekten kafa karıştırıcı. Eski sistem daha anlaşılırdı bence.', 3, 3),
('Premier modunu denedin mi? Competitive''den daha eğlenceli geliyor bana.', 5, 3),
('Faceit''e geçmeyi düşünüyor musun? MM artık pek oynanmıyor.', 6, 3),

-- Thread 4: Valorant Agent Tier List
('Jett ve Reyna hala güçlü ama Phoenix biraz buff aldı son patch''te.', 3, 4),
('Sentinel main olarak Cypher''ı öneriyorum. Her haritada etkili.', 5, 4),

-- Thread 5: LoL Sezon 14
('Jungle değişiklikleri iyi olmuş bence. Artık daha aktif oynuyorum.', 3, 5),
('ADC main olarak jungle''daki bu değişiklikler bot lane''i de etkiliyor.', 4, 5),

-- Thread 6: Dota 2 vs LoL
('İkisini de 1000+ saat oynadım. Dota daha karmaşık ama derinliği var. LoL daha erişilebilir.', 3, 6),
('Yeni başlayanlar kesinlikle LoL''den başlasın. Dota çok zorlayıcı olabilir.', 4, 6),
('Dota''nın ekonomisi daha iyi, tüm heroları bedava. LoL''de champion almak için grind gerekiyor.', 5, 6),

-- Thread 7: Gaming PC Rehberi
('Çok detaylı rehber olmuş, emeğinize sağlık! 25K bütçe ile toplama yapacağım.', 3, 7),
('SSD önerilerini de ekleyebilir misiniz? Gaming için NVMe şart mı?', 4, 7),
('PSU seçimi çok önemli, kaliteli marka almak lazım. Seasonic öneririm.', 5, 7),

-- Thread 8: Oyun Bağımlılığı
('Çok önemli bir konu bu. Ben kendim için günlük oyun süresi limiti koydum.', 3, 8),
('Spor yapmak ve sosyal aktiviteler dengeli yaşam için çok önemli.', 4, 8),
('Oyun bağımlılığı gerçek bir sorun. Professional yardım almaktan çekinmeyin.', 1, 8),

-- Haber thread'leri için yorumlar
-- Thread 9: PS5 Pro
('Fiyatı çok yüksek geldi bana. PS5 daha yeni çıktı.', 3, 9),
('Ray tracing performansı çok etkileyici görünüyor.', 4, 9),
('Bu fiyata PC toplarım daha iyi.', 6, 9),

-- Thread 10: Steam Sale
('Baldur''s Gate 3 indirimde, kesinlikle alın!', 3, 10),
('Cyberpunk 2077 artık %75 indirimde, şimdi alınır.', 4, 10),
('Wishlist''imdeki oyunların hepsi indirimde, cüzdan boşalacak.', 5, 10),

-- Thread 11: GTA 6
('Grafikleri inanılmaz! Vice City''nin dönüşü harika.', 3, 11),
('Çıkış tarihi 2025 denmişti, umarım ertelenmez.', 4, 11),
('Fiyatı 70-80$ olacak kesin, ama yine de alacağım.', 5, 11),

-- İnceleme thread'leri için yorumlar
-- Thread 12: RTX Karşılaştırma
('4070 Ti''ın ray tracing performansı çok daha iyi.', 3, 12),
('Ben 4070 aldım ve 1440p''de gayet memnunum.', 4, 12),
('DLSS 3 desteği çok önemli artık.', 5, 12),

-- Thread 13: 2024 En İyi Oyunlar
('Baldur''s Gate 3 kesinlikle yılın oyunu!', 3, 13),
('Helldivers 2 co-op deneyimi harika.', 4, 13),
('Indie oyunlardan Pizza Tower da çok iyiydi.', 6, 13),

-- Thread 14: Elden Ring DLC
('DLC boss''ları ana oyundan bile zor!', 3, 14),
('Hikaye açısından çok tatmin edici.', 4, 14),
('Messmer fight''ı efsane tasarım.', 5, 14),

-- Thread 15: Cyberpunk 2077
('Artık oynanabilir durumda gerçekten.', 3, 15),
('Phantom Liberty DLC çok kaliteli.', 4, 15),
('Ray tracing ile görünüm harika.', 6, 15);

-- 👍 Örnek Post Beğenileri
INSERT INTO likes (user_id, post_id) VALUES
(1, 1), (1, 4), (1, 7), (1, 10),
(2, 2), (2, 5), (2, 8), (2, 11),
(3, 3), (3, 6), (3, 9), (3, 12),
(4, 1), (4, 2), (4, 13), (4, 15),
(5, 4), (5, 7), (5, 14), (5, 16),
(6, 5), (6, 8), (6, 17), (6, 18);

-- 👍 Thread Beğenileri
INSERT INTO thread_likes (user_id, thread_id) VALUES
-- İnceleme thread'leri için beğeniler
(1, 4), (2, 4), (3, 4), (5, 4), -- Valorant Agent Tier List
(1, 12), (3, 12), (4, 12), (5, 12), (6, 12), -- RTX Karşılaştırma
(1, 13), (2, 13), (3, 13), (4, 13), (6, 13), -- 2024 En İyi Oyunlar
(2, 14), (3, 14), (4, 14), (5, 14), (6, 14), -- Elden Ring DLC
(1, 15), (3, 15), (4, 15), (6, 15), -- Cyberpunk 2077
-- Haber thread'leri için beğeniler
(2, 9), (3, 9), (4, 9), (5, 9), -- PS5 Pro
(1, 10), (3, 10), (4, 10), (5, 10), -- Steam Sale
(1, 11), (2, 11), (3, 11), (4, 11), (5, 11), (6, 11); -- GTA 6

-- 👥 Örnek Takipler
INSERT INTO follows (follower_id, following_id) VALUES
(2, 1), (3, 1), (4, 1), (5, 1), (6, 1), -- Herkesi admin takip ediyor
(1, 2), (3, 2), (4, 2), -- Moderator takip ediliyor
(4, 3), (5, 3), (6, 3), -- GameMaster takip ediliyor
(3, 4), (5, 4), (6, 4), -- ProPlayer takip ediliyor
(3, 6), (4, 6), (5, 6); -- TechGuru takip ediliyor

-- ⚙️ Örnek Kullanıcı Ayarları
INSERT INTO user_settings (user_id) VALUES
(1), (2), (3), (4), (5), (6);

-- 🚨 Örnek Şikayetler (Test için)
INSERT INTO reports (reporter_id, thread_id, report_type, reason, description) VALUES
(2, 1, 'thread', 'spam', 'Bu konu çok fazla tekrar edildi'),
(3, 2, 'thread', 'inappropriate_content', 'Uygunsuz içerik var');

-- =======================================
-- 📋 VERİTABANI İNDEKSLERİ (Performans için)  
-- =======================================

-- Thread'ler için indeksler
CREATE INDEX idx_threads_category_id ON threads(category_id);
CREATE INDEX idx_threads_author_id ON threads(author_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_threads_view_count ON threads(view_count DESC);
CREATE INDEX idx_threads_pinned ON threads(is_pinned DESC);

-- Post'lar için indeksler
CREATE INDEX idx_posts_thread_id ON posts(thread_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Profiller için indeksler
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Thread beğenileri için indeks
CREATE INDEX idx_thread_likes_thread_id ON thread_likes(thread_id);
CREATE INDEX idx_thread_likes_user_id ON thread_likes(user_id);

-- Şikayetler için indeks
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Takipler için indeks
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);