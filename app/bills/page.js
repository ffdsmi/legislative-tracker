'use client';

import { useState } from 'react';
import Link from 'next/link';

const JURISDICTIONS = [
  { value: '', label: 'All Jurisdictions' },
  { value: 'US', label: 'U.S. Congress' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'introduced', label: 'Introduced' },
  { value: 'committee', label: 'In Committee' },
  { value: 'floor', label: 'Floor Vote' },
  { value: 'passed', label: 'Passed' },
  { value: 'signed', label: 'Signed' },
  { value: 'vetoed', label: 'Vetoed' },
];

const DEMO_BILLS = [
  { id: 1, number: 'HR 1234', title: 'Infrastructure Investment and Jobs Act Amendment', jurisdiction: 'U.S. Congress', status: 'In Committee', introduced: '2026-03-10', lastAction: '2026-03-24' },
  { id: 2, number: 'LB 567', title: 'Nebraska Clean Energy Transition Act', jurisdiction: 'Nebraska', status: 'Introduced', introduced: '2026-03-15', lastAction: '2026-03-20' },
  { id: 3, number: 'SB 890', title: 'Data Privacy and Consumer Protection Act', jurisdiction: 'California', status: 'Floor Vote', introduced: '2026-02-01', lastAction: '2026-03-25' },
  { id: 4, number: 'HR 2345', title: 'Federal Cybersecurity Enhancement Act of 2026', jurisdiction: 'U.S. Congress', status: 'Introduced', introduced: '2026-03-22', lastAction: '2026-03-22' },
  { id: 5, number: 'LB 123', title: 'Property Tax Reform and Relief Act', jurisdiction: 'Nebraska', status: 'In Committee', introduced: '2026-01-20', lastAction: '2026-03-18' },
];

export default function BillsPage() {
  const [search, setSearch] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [status, setStatus] = useState('');

  const filteredBills = DEMO_BILLS.filter((bill) => {
    const matchesSearch = search === '' ||
      bill.title.toLowerCase().includes(search.toLowerCase()) ||
      bill.number.toLowerCase().includes(search.toLowerCase());
    const matchesJurisdiction = jurisdiction === '' || bill.jurisdiction.includes(jurisdiction);
    const matchesStatus = status === '' || bill.status.toLowerCase().includes(status.toLowerCase());
    return matchesSearch && matchesJurisdiction && matchesStatus;
  });

  return (
    <>
      <div className="page-header fade-in">
        <h1>Bill Explorer</h1>
        <p>Search and browse bills across all tracked jurisdictions</p>
      </div>

      <div className="filter-bar fade-in">
        <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Search by bill number or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
        >
          {JURISDICTIONS.map((j) => (
            <option key={j.value} value={j.value}>{j.label}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          {filteredBills.length} results
        </span>
      </div>

      <div className="card fade-in">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Title</th>
              <th>Jurisdiction</th>
              <th>Status</th>
              <th>Introduced</th>
              <th>Last Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <Link href={`/bills/${bill.id}`} className="bill-number">
                      {bill.number}
                    </Link>
                  </td>
                  <td className="bill-title">{bill.title}</td>
                  <td>
                    <span className="badge badge-info">{bill.jurisdiction}</span>
                  </td>
                  <td>
                    <span className="badge badge-status">{bill.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {bill.introduced}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {bill.lastAction}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">+ Watch</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>No bills found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
