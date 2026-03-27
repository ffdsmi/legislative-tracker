import { NextResponse } from 'next/server';

// GET /api/bills — list bills with optional filters
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get('jurisdiction');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  // TODO: query PostgreSQL with filters
  // For now, return demo data
  const bills = [
    { id: 1, number: 'HR 1234', title: 'Infrastructure Investment and Jobs Act Amendment', jurisdiction: 'US', status: 'committee', session: '119th Congress', introduced_date: '2026-03-10', last_action_date: '2026-03-24', source_url: 'https://congress.gov/bill/119th-congress/house-bill/1234' },
    { id: 2, number: 'LB 567', title: 'Nebraska Clean Energy Transition Act', jurisdiction: 'NE', status: 'introduced', session: '109th Legislature', introduced_date: '2026-03-15', last_action_date: '2026-03-20', source_url: 'https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=56700' },
  ];

  return NextResponse.json({ bills, total: bills.length });
}
