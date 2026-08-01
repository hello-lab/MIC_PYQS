'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Manuscript } from '@/lib/googleSheets';

export default function MainPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');
  const [activeModalItem, setActiveModalItem] = useState<Manuscript | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5000;

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/manuscripts');
        const data = await res.json();
        if (Array.isArray(data)) {
          setManuscripts(data);
        }
      } catch (err) {
        console.error('Failed to load Google Sheet data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredManuscripts = useMemo(() => {
    return manuscripts.filter((item) => {
      if (!item) return false;

      const query = (searchQuery || '').toLowerCase();
      const courseCode = (item.courseCode || '').toLowerCase();
      const courseTitle = (item.courseTitle || '').toLowerCase();
      const filename = (item.filename || '').toLowerCase();
      const id = (item.id || '').toLowerCase();

      const matchesSearch =
        courseCode.includes(query) ||
        courseTitle.includes(query) ||
        filename.includes(query) ||
        id.includes(query);

      const matchesDivision =
        selectedDivision === 'ALL' ||
        (item.division || '').toUpperCase().includes(selectedDivision.toUpperCase());

      const matchesTerm =
        selectedTerm === 'ALL' ||
        (item.examType || '').toUpperCase() === selectedTerm.toUpperCase() ||
        (item.term || '').toUpperCase() === selectedTerm.toUpperCase();

      return matchesSearch && matchesDivision && matchesTerm;
    });
  }, [manuscripts, searchQuery, selectedDivision, selectedTerm]);

  const totalPages = Math.ceil(filteredManuscripts.length / itemsPerPage) || 1;
  const paginatedManuscripts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredManuscripts.slice(start, start + itemsPerPage);
  }, [filteredManuscripts, currentPage]);

  // Reset pagination on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDivision, selectedTerm]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
    

      {/* 2. FILTER & SEARCH CONTROL PANEL */}
      <section className="bg-vellum p-6 border-4 border-black shadow-[6px_6px_0_#000] space-y-4 text-black">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Course, Title, Filename..."
              className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold placeholder:text-iron/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold">🔍</span>
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="bg-[#ebe0d4] border-2 border-black text-xs font-bold px-3 py-2 rounded focus:outline-none"
            >
              <option value="ALL">All Divisions</option>
              <option value="SCOPE">SCOPE (Computer Science)</option>
              <option value="SAS">SAS (Sciences/Math)</option>
              <option value="SENSE">SENSE (Electronics)</option>
              <option value="SELECT">SELECT (Electrical)</option>
              <option value="SMEC">SMEC (Mechanical)</option>
              <option value="SSL">SSL (Humanities)</option>
            </select>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="bg-[#ebe0d4] border-2 border-black text-xs font-bold px-3 py-2 rounded focus:outline-none"
            >
              <option value="ALL">All Exam Terms</option>
              <option value="CAT 1">CAT 1</option>
              <option value="CAT 2">CAT 2</option>
              <option value="FAT">FAT Final Exam</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. ARCHIVAL LEDGER TABLE */}
      <section className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] h-[65dvh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-mahog">
              <tr className="border-b-4 border-black text-gold">
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">
                  SLOT
                </th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">
                  Subject Index
                </th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">
                  Term
                </th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">
                  Status
                </th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-pixel text-xs text-mahog">
                    UNFURLING SCROLLS FROM GOOGLE SHEETS...
                  </td>
                </tr>
              ) : paginatedManuscripts.length > 0 ? (
                paginatedManuscripts.map((item) => (
                  <tr
                    key={item.id}
                    className="parchment-row hover:brightness-95 transition-all cursor-pointer group"
                    onClick={() => setActiveModalItem(item)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                      
                        <div>
                          <p className="text-[10px] text-iron/60 uppercase">
                           {item.slot || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-sm text-iron font-bold uppercase">
                        {item.courseTitle}
                      </span>
                      <p className="text-[10px] text-iron/90">
                        {item.courseCode} — {item.division}
                      </p>
                    </td>

                    <td className="p-4">
                      <div className="text-[10px] font-bold">
                        <p className="text-mahog">{item.semester}</p>
                        <p className="text-iron/60 uppercase">{item.examType}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-1 bg-emerald/20 text-emerald border border-emerald/40 rounded text-[9px] font-pixel stamp">
                        VERIFIED
                      </span>
                    </td>

                    
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-iron/50 font-bold uppercase">
                    No manuscripts match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      
      </section>

      {/* 4. INSPECTION MODAL */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] max-w-lg w-full p-6 space-y-2 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b-2 border-black/20 pb-4">
              <div>
                <span className="px-2 py-1 bg-wax text-vellum text-[8px] font-pixel uppercase">
                  MANUSCRIPT PREVIEW
                </span>
                <h3 className="font-pixel text-sm text-mahog mt-2">
                  {activeModalItem.courseTitle}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="font-pixel text-xs p-2 hover:text-wax"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-ink font-pixel">
                         <p><strong>Slot:</strong> {activeModalItem.slot}</p>
              <iframe src={(activeModalItem.downloadUrl)} className="w-full h-[60vh] border border-black" />
            </div>

            <div className="pt-4 border-t-2 border-black/20 flex gap-4">
              <a
                href={activeModalItem.downloadUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-gold text-mahog font-pixel text-[9px] border-2 border-black pixel-btn text-center"
              >
                DOWNLOAD SCROLL
              </a>
              <button
                onClick={() => setActiveModalItem(null)}
                className="py-3 px-4 bg-iron text-vellum font-pixel text-[9px] border-2 border-black pixel-btn"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}