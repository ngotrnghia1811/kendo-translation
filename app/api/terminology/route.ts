import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: terms, error } = await supabase
            .from('terminology')
            .select('id, source_term, target_term, reading, domain, notes')
            .order('source_term', { ascending: true })
            .limit(1000)

        if (error) {
            console.error('Error fetching terminology:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ terms: terms || [] })
    } catch (error) {
        console.error('Error in terminology GET:', error)
        return NextResponse.json({ error: 'Failed to fetch terminology' }, { status: 500 })
    }
}
