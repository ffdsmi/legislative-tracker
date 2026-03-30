'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState('month'); // list | month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [filterType, setFilterType] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');
  const [listRange, setListRange] = useState('upcoming');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // 1. Immediately display the currently cached database events
      const res = await fetch('/api/calendar');
      const data = await res.json();
      setEvents(data.events || []);
      setLoading(false); // Stop the main loading spinner so the UI shows up
      
      // 2. Perform a fresh background sync on every load
      setSyncing(true);
      await fetch('/api/calendar', { method: 'POST' });
      
      // 3. Re-fetch and seamlessly update the UI
      const res2 = await fetch('/api/calendar');
      const data2 = await res2.json();
      setEvents(data2.events || []);
      setSyncing(false);
      
    } catch (err) {
      console.error(err);
      setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/calendar', { method: 'POST' });
      await fetchEvents();
    } catch (err) {
      console.error(err);
    }
    setSyncing(false);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10));
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getEventColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('hearing')) return { bg: 'var(--bg-blue, #1e3a8a)', text: 'var(--text-blue, #93c5fd)', border: 'var(--border-blue, #3b82f6)' };
    if (t.includes('vote')) return { bg: 'var(--bg-red, #7f1d1d)', text: 'var(--text-red, #fca5a5)', border: 'var(--border-red, #ef4444)' };
    if (t.includes('markup')) return { bg: 'var(--bg-orange, #7c2d12)', text: 'var(--text-orange, #fdba74)', border: 'var(--border-orange, #f97316)' };
    if (t.includes('regulat')) return { bg: 'var(--bg-green, #14532d)', text: 'var(--text-green, #86efac)', border: 'var(--border-green, #22c55e)' };
    return { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)', border: 'var(--border-primary)' };
  };

  const navPrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    if (view === 'week') d.setDate(d.getDate() - 7);
    if (view === 'day') d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    if (view === 'week') d.setDate(d.getDate() + 7);
    if (view === 'day') d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // Nav labels
  let navLabel = '';
  if (view === 'month' || view === 'list') {
    navLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  } else if (view === 'day') {
    navLabel = currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  } else if (view === 'week') {
    const dStart = new Date(currentDate);
    dStart.setDate(dStart.getDate() - dStart.getDay());
    const dEnd = new Date(dStart);
    dEnd.setDate(dEnd.getDate() + 6);
    navLabel = `${dStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${dEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterType !== 'ALL' && !(e.type || '').toUpperCase().includes(filterType)) return false;
    if (filterState !== 'ALL' && e.state !== filterState) return false;
    return true;
  });

  const getEventsForDate = (dateObj) => {
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const downloadIsc = (e) => {
    const start = new Date(`${e.date}T${e.time || '12:00:00'}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const content = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${formatDate(start)}\nDTEND:${formatDate(end)}\nSUMMARY:${e.type}: ${e.description}\nLOCATION:${e.location || ''}\nDESCRIPTION:Jurisdiction: ${e.state}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event-${e.id || 'calendar'}.ics`;
    link.click();
  };

  // Renderers
  const renderList = () => {
    let listEvts = filteredEvents;
    
    if (listRange === 'month') {
      listEvts = filteredEvents.filter(e => {
        if (!e.date) return false;
        const [eYear, eMonth] = e.date.split('-');
        return parseInt(eYear, 10) === currentDate.getFullYear() && parseInt(eMonth, 10) - 1 === currentDate.getMonth();
      });
    } else if (listRange === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      listEvts = filteredEvents.filter(e => {
        if (!e.date) return false;
        return new Date(`${e.date}T12:00:00`) >= today;
      });
    }

    listEvts.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-1)' }}>
          <select className="input" value={listRange} onChange={e => setListRange(e.target.value)} style={{ padding: 'var(--space-2)' }}>
            <option value="upcoming">Upcoming Events</option>
            <option value="month">This Month</option>
            <option value="all">All Events</option>
          </select>
        </div>
        {listEvts.length === 0 && <div className="empty-state">No events found.</div>}
        {listEvts.slice(0, 100).map((e, idx) => {
          const c = getEventColor(e.type);
          return (
            <div key={idx} className="card hover-glow" style={{ borderLeft: `4px solid ${c.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedEvent(e)}>
              <div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="badge" style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    {e.state}
                  </span>
                  <strong style={{ color: c.text }}>{(e.type || 'Event').toUpperCase()}</strong>
                </div>
                <div style={{ fontSize: 'var(--text-base)', marginBottom: '4px' }}>{e.description}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>📍 {e.location || 'Location TBD'}</div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingLeft: 'var(--space-4)' }}>
                <div style={{ fontWeight: 600 }}>{new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{formatTime(e.time)}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ padding: 'var(--space-2)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-xs)', borderRight: '1px solid var(--border-primary)' }}>{day}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', opacity: 0.3, borderBottom: '1px solid var(--border-primary)' }} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const targetDate = new Date(year, month, day);
            const dayEvents = getEventsForDate(targetDate);
            const isToday = new Date().toDateString() === targetDate.toDateString();

            return (
              <div key={`day-${day}`} style={{ borderRight: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)', padding: 'var(--space-1)', backgroundColor: isToday ? 'var(--bg-hover)' : 'var(--bg-primary)' }}>
                <div style={{ padding: '4px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dayEvents.slice(0, 4).map((e, idx) => {
                    const c = getEventColor(e.type);
                    return (
                      <div key={`e-${idx}`} onClick={() => setSelectedEvent(e)} style={{ fontSize: '10px', padding: '2px 4px', backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong>{formatTime(e.time)}</strong> {e.state}: {e.description}
                      </div>
                    );
                  })}
                  {dayEvents.length > 4 && <div style={{ fontSize: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>+{dayEvents.length - 4} more</div>}
                </div>
              </div>
            );
          })}
          {Array.from({ length: (7 - ((firstDay + days) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} style={{ borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', opacity: 0.3, borderBottom: '1px solid var(--border-primary)' }} />
          ))}
        </div>
      </div>
    );
  };

  const renderTimeline = (startDate, numDays) => {
    const daysArr = Array.from({ length: numDays }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    const hours = Array.from({ length: 15 }).map((_, i) => i + 7); // 7 AM to 9 PM
    const now = new Date();
    const isCurrentWeek = daysArr.some(d => d.toDateString() === now.toDateString());

    return (
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${numDays}, minmax(150px, 1fr))`, borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }} />
          {daysArr.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString();
            return (
              <div key={i} style={{ padding: 'var(--space-2)', textAlign: 'center', fontWeight: isToday ? 700 : 600, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)', borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                <div>{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div style={{ fontSize: 'var(--text-lg)' }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: 'relative', overflowY: 'auto', maxHeight: '600px' }}>
          {hours.map(h => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: `60px repeat(${numDays}, minmax(150px, 1fr))`, height: '60px' }}>
              <div style={{ padding: '4px', textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)', borderRight: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </div>
              {daysArr.map((_, i) => (
                <div key={i} style={{ borderRight: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)', position: 'relative' }} />
              ))}
            </div>
          ))}

          {/* Render 'Now' Line */}
          {isCurrentWeek && now.getHours() >= 7 && now.getHours() <= 21 && (
            <div style={{
              position: 'absolute',
              left: '60px',
              right: 0,
              top: `${(now.getHours() - 7 + now.getMinutes() / 60) * 60}px`,
              borderTop: '2px solid red',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <div style={{ position: 'absolute', left: '-6px', top: '-4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'red' }} />
            </div>
          )}

          {/* Render Events */}
          {daysArr.map((d, dayIndex) => {
            const evts = getEventsForDate(d);
            return evts.map((e, eIdx) => {
              if (!e.time) return null;
              const [h, m] = e.time.split(':');
              const topVal = (parseInt(h) - 7 + parseInt(m) / 60) * 60;
              if (parseInt(h) < 7 || parseInt(h) > 21) return null; // out of scope
              
              const c = getEventColor(e.type);
              return (
                <div key={`${e.id}-${eIdx}`} onClick={() => setSelectedEvent(e)} style={{
                  position: 'absolute',
                  left: `calc(60px + ${dayIndex} * ((100% - 60px) / ${numDays}) + 4px)`,
                  width: `calc(((100% - 60px) / ${numDays}) - 8px)`,
                  top: `${topVal}px`,
                  minHeight: '50px',
                  backgroundColor: c.bg,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderLeft: `3px solid ${c.border}`,
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  zIndex: 5,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontWeight: 600 }}>{formatTime(e.time)} {e.state}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const dStart = new Date(currentDate);
    dStart.setDate(dStart.getDate() - dStart.getDay());
    return renderTimeline(dStart, 7);
  };

  const renderDay = () => {
    return renderTimeline(currentDate, 1);
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <h1 className="page-title">Legislative Calendar</h1>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <select className="input" value={filterState} onChange={(e) => setFilterState(e.target.value)} style={{ padding: 'var(--space-2)' }}>
            <option value="ALL">All Jurisdictions</option>
            {[...new Set(events.map(e => e.state))].filter(Boolean).sort().map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: 'var(--space-2)' }}>
            <option value="ALL">All Event Types</option>
            <option value="HEARING">Hearings</option>
            <option value="VOTE">Floor Votes</option>
            <option value="MARKUP">Markups</option>
            <option value="REGULAT">Regulations</option>
          </select>

          <div className="filter-bar" role="tablist" style={{ margin: 0, padding: 0 }}>
            {['list', 'month', 'week', 'day'].map(v => (
              <button key={v} className={`tab-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)} role="tab" style={{ textTransform: 'capitalize' }}>{v}</button>
            ))}
          </div>

          <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{navLabel}</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={navPrev}>&larr; Prev</button>
          <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn btn-secondary" onClick={navNext}>Next &rarr;</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading calendar...</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div>📅</div>
          <h3>No events found</h3>
          <p>Click "Sync Data" to automatically fetch updates from your tracked jurisdictions.</p>
        </div>
      ) : (
        <>
          {view === 'list' && renderList()}
          {view === 'month' && renderMonth()}
          {view === 'week' && renderWeek()}
          {view === 'day' && renderDay()}
        </>
      )}

      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedEvent(null)}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }} onClick={() => setSelectedEvent(null)}>&times;</button>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <span className="badge badge-outline">{selectedEvent.state}</span>
              <span className="badge" style={{ backgroundColor: getEventColor(selectedEvent.type).bg, color: getEventColor(selectedEvent.type).text }}>{(selectedEvent.type || 'Event').toUpperCase()}</span>
            </div>
            
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>{selectedEvent.description}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 'var(--space-4) 0', color: 'var(--text-secondary)' }}>
              <div>📅 <strong>Date:</strong> {new Date(`${selectedEvent.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <div>⏰ <strong>Time:</strong> {formatTime(selectedEvent.time) || 'TBD'}</div>
              <div>📍 <strong>Location:</strong> {selectedEvent.location || 'Location Not Specified'}</div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => downloadIsc(selectedEvent)}>
                Export to iCal
              </button>
              {selectedEvent.billId ? (
                <Link href={`/bills/${selectedEvent.billId}`} className="btn btn-primary">
                  View Associated Bill &rarr;
                </Link>
              ) : (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No direct bill linked.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
