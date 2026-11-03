// app/api/daily_entries/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { shouldTriggerAlert } from "@/config/alerts";

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const entry = await request.json();
  // Upsert daily entry (unique by user_id + date)
  const { data: upserted, error } = await supabase
    .from("daily_entries")
    .upsert({
      user_id: user.id,
      date: entry.date,
      mood: entry.mood,
      activity: entry.activity,
      pulse: entry.pulse,
      pressure: entry.pressure,
      weight: entry.weight,
      sleep: entry.sleep,
      notes: entry.notes,
    })
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Assume entry includes symptoms array for alert checking
  const trigger = entry.symptoms ? shouldTriggerAlert(entry) : false;
  return NextResponse.json({ success: true, alert: trigger, data: upserted });
}
