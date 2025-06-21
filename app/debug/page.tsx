'use client';

import { useState, useEffect } from 'react';
import { 
  FaSync, 
  FaDatabase, 
  FaUsers, 
  FaComments, 
  FaFolder, 
  FaFlag, 
  FaHeart, 
  FaUserCog, 
  FaProjectDiagram,
  FaExclamationTriangle,
  FaEye,
  FaCogs,
  FaUser
} from 'react-icons/fa';

interface TableData {
  [key: string]: any[];
}

interface TableStats {
  users: number;
  profiles: number;
  categories: number;
  threads: number;
  posts: number;
  likes: number;
  thread_likes: number;
  reports: number;
  follows: number;
  user_settings: number;
}

export default function DebugPage() {
  const [tableData, setTableData] = useState<TableData>({});
  const [tableStats, setTableStats] = useState<TableStats>({
    users: 0,
    profiles: 0,
    categories: 0,
    threads: 0,
    posts: 0,
    likes: 0,
    thread_likes: 0,
    reports: 0,
    follows: 0,
    user_settings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('users');

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug/tables');
      if (!response.ok) {
        throw new Error('Veri alınamadı');
      }
      const data = await response.json();
      setTableData(data.tables);
      setTableStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, []);

  const renderTable = (tableName: string, data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          Bu tabloda veri bulunmuyor
        </div>
      );
    }

    const columns = Object.keys(data[0]);
    
    return (
      <div className="w-full">
        <div className="overflow-auto max-h-96 border border-dark-700 rounded-lg bg-dark-800">
          <table className="min-w-full border-collapse">
            <thead className="bg-dark-700 sticky top-0">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border border-dark-600 px-3 py-2 text-left text-sm font-medium text-white whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-dark-800' : 'bg-dark-750'}>
                  {columns.map((column) => (
                    <td key={column} className="border border-dark-600 px-3 py-2 text-sm min-w-[120px] max-w-xs text-gray-300">
                      <div className="truncate" title={String(row[column])}>
                        {typeof row[column] === 'object' 
                          ? JSON.stringify(row[column]) 
                          : String(row[column] || '')}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getTableIcon = (tableName: string) => {
    const iconMap: { [key: string]: React.JSX.Element } = {
      users: <FaUsers className="h-4 w-4" />,
      profiles: <FaUser className="h-4 w-4" />,
      categories: <FaFolder className="h-4 w-4" />,
      threads: <FaComments className="h-4 w-4" />,
      posts: <FaComments className="h-4 w-4" />,
      likes: <FaHeart className="h-4 w-4" />,
      thread_likes: <FaHeart className="h-4 w-4" />,
      reports: <FaFlag className="h-4 w-4" />,
      follows: <FaUsers className="h-4 w-4" />,
      user_settings: <FaCogs className="h-4 w-4" />
    };
    return iconMap[tableName] || <FaDatabase className="h-4 w-4" />;
  };

  const getTableTitle = (tableName: string) => {
    const titleMap: { [key: string]: string } = {
      users: 'Kullanıcılar',
      profiles: 'Profiller', 
      categories: 'Kategoriler',
      threads: 'Konular',
      posts: 'Mesajlar',
      likes: 'Beğeniler',
      thread_likes: 'Konu Beğenileri',
      reports: 'Raporlar',
      follows: 'Takipler',
      user_settings: 'Kullanıcı Ayarları'
    };
    return titleMap[tableName] || tableName;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <FaSync className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-500" />
              <p>Veriler yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-dark-800 rounded-xl border border-dark-700 p-6">
            <div className="text-center text-red-400">
              <FaExclamationTriangle className="h-8 w-8 mx-auto mb-4" />
              <p className="font-medium">Hata oluştu</p>
              <p className="text-sm mt-2">{error}</p>
              <button 
                onClick={fetchTableData} 
                className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Debug Panel</h1>
            <p className="text-gray-400 mt-2">Database tabloları ve istatistikleri</p>
          </div>
          <button 
            onClick={fetchTableData} 
            className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-500/50 px-4 py-2 rounded-lg transition-all"
          >
            <FaSync className="h-4 w-4" />
            Yenile
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(tableStats).map(([tableName, count]) => (
            <div key={tableName} className="bg-dark-800 rounded-lg border border-dark-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="text-primary-500">
                  {getTableIcon(tableName)}
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-400">{getTableTitle(tableName)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          <div className="flex border-b border-dark-700 overflow-x-auto">
            {Object.keys(tableData).map((tableName) => (
              <button
                key={tableName}
                onClick={() => setActiveTab(tableName)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tableName
                    ? 'bg-primary-600 text-white border-b-2 border-primary-400'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                {getTableIcon(tableName)}
                <span className="text-sm">{getTableTitle(tableName)}</span>
                <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                  {tableData[tableName]?.length || 0}
                </span>
              </button>
            ))}
            <button
              onClick={() => setActiveTab('diagram')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'diagram'
                  ? 'bg-primary-600 text-white border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <FaProjectDiagram className="h-4 w-4" />
              <span className="text-sm">Diyagram</span>
            </button>
          </div>

          <div className="p-6">
            {Object.entries(tableData).map(([tableName, data]) => 
              activeTab === tableName && (
                <div key={tableName}>
                  <div className="flex items-center gap-2 mb-4">
                    {getTableIcon(tableName)}
                    <h2 className="text-xl font-semibold text-white">
                      {getTableTitle(tableName)} ({data.length} kayıt)
                    </h2>
                  </div>
                  {renderTable(tableName, data)}
                </div>
              )
            )}

            {/* Diagram Tab */}
            {activeTab === 'diagram' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FaProjectDiagram className="h-5 w-5 text-primary-500" />
                  <h2 className="text-xl font-semibold text-white">Database Şeması Diyagramı</h2>
                </div>
                <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 overflow-auto max-h-[80vh]">
                  <div className="flex justify-center">
                    <img 
                      src="/supabase-sema.svg" 
                      alt="Database Schema Diagram" 
                      className="max-w-full h-auto"
                      style={{ minWidth: '800px' }}
                    />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <p>Bu diyagram database tablolarının yapısını ve aralarındaki ilişkileri göstermektedir.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 