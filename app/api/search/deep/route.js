import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const trimmedQuery = query.trim();
    
    // SQLite uses case-insensitive LIKE implicitly for basic ASCII.
    const textMatches = await db.billText.findMany({
      where: { 
        workspaceId: session.workspaceId,
        text: { contains: trimmedQuery } 
      },
      include: {
        bill: {
          select: {
            title: true,
            number: true,
            state: true,
            status: true
          }
        }
      },
      take: 50
    });

    const results = textMatches.map(match => {
      // Find where the query is in the text
      const regex = new RegExp(`(${trimmedQuery})`, 'gi');
      const text = match.text || '';
      const matchIndex = text.search(regex);
      
      let snippet = text;
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 80);
        const end = Math.min(text.length, matchIndex + trimmedQuery.length + 80);
        snippet = (start > 0 ? '...' : '') + 
                  text.substring(start, end) + 
                  (end < text.length ? '...' : '');
      } else {
        snippet = text.substring(0, 150) + '...';
      }

      return {
        id: match.billId,
        title: match.bill?.title || 'Unknown Bill',
        number: match.bill?.number || 'Unknown',
        jurisdiction: match.bill?.state || '',
        status: match.bill?.status || 0,
        snippet: snippet,
      }
    });

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error('Deep Search Error:', err);
    return NextResponse.json({ error: 'Failed to perform deep search' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

