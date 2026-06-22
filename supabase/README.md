# WeDrink — Supabase баптауы

Қадамдарды **дәл осы ретпен** орындаңыз. Маңызды: TypeScript кодын **SQL Editor-ге қоймаңыз** — ол Edge Functions бөліміне қойылады.

## 1. AI функциясын орнату (Edge Function)

1. Supabase Dashboard → сол жақтан **Edge Functions** (⚡).
2. **Create a function** → аты: **`ai`** (дәл осылай, кіші әріппен).
3. [`functions/ai/index.ts`](functions/ai/index.ts) файлының бүкіл кодын көшіріп, редакторға қойыңыз.
4. **Deploy** басыңыз.

Функция мекенжайы: `https://<жоба-id>.supabase.co/functions/v1/ai`

## 2. Құпияларды қою (Secrets)

Edge Functions → **Secrets** (немесе Project Settings → Edge Functions → Manage secrets):

| Атауы | Мәні | Міндетті ме |
|-------|------|-------------|
| `GEMINI_API_KEY` | Gemini кілтіңіз | ✅ иә |
| `GEMINI_MODEL` | `gemini-2.5-flash` | жоқ |
| `APP_SHARED_SECRET` | өзіңіз ойлаған құпиясөз | жоқ (ұсынылады) |

## 3. (Қаласаңыз) Синхрондау кестесі — SQL Editor

Бұл — **нағыз SQL**, оны **SQL Editor**-ге қойып «Run» басыңыз:

```sql
create table if not exists wedrink_state (
  id text primary key,
  payload jsonb,
  rev bigint default 0,
  updated_at timestamptz default now()
);
alter table wedrink_state enable row level security;
create policy "wedrink all" on wedrink_state for all using (true) with check (true);
```

## 4. Қосымшаны жалғау

WeDrink → **Баптаулар → AI көмекші → Провайдер: Supabase сервер**:
- **Edge Function сілтемесі:** `https://<жоба-id>.supabase.co/functions/v1/ai`
- **Supabase anon key:** жобаңыздың anon public кілті
- **Қосымша құпиясөз:** жоғарыдағы `APP_SHARED_SECRET` (қойсаңыз)
- **Сақтау** → AI бөлімінде сұрақ қойып не чек сканерлеп тексеріңіз.
